import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  businessRole,
  defaultEnrollmentFormDefinition,
  enrollmentFormDefinitionSchema,
  validateEnrollmentAnswers,
  type EnrollmentApplicationForward,
  type EnrollmentApplicationQuery,
  type EnrollmentFormConfig,
  type EnrollmentFormUpdate,
  type EnrollmentPublicSubmission,
  type Permission,
  type PublishedEnrollmentForm,
  type User,
} from "@freshphones/contracts";
import { requireCurrentUser } from "../auth/access";
import { Database } from "../database";
import type { Prisma } from "../generated/prisma/client";
import { RoleWorkspaceService } from "../records/role-workspace.service";
import {
  applicationChanged,
  applicationInclude,
  applicationScope,
  applicationView,
  canonicalAnswers,
  json,
  notifyReceivingAgent,
  receivingAgentWhere,
} from "./enrollment-form-tools";

@Injectable()
export class EnrollmentFormsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(RoleWorkspaceService)
    private readonly workspace: RoleWorkspaceService,
  ) {}

  private write<T>(
    user: User,
    permission: Permission,
    run: (tx: Prisma.TransactionClient, current: User) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      const current = await requireCurrentUser(tx, user, permission);

      return run(tx, current);
    });
  }

  private async configView(
    tx: Prisma.TransactionClient,
  ): Promise<EnrollmentFormConfig> {
    const [config, agents] = await Promise.all([
      tx.enrollmentFormConfig.findUnique({
        where: { id: "singleton" },
        include: { publishedRevision: { select: { id: true, number: true } } },
      }),
      tx.user.findMany({
        where: receivingAgentWhere,
        select: {
          id: true,
          name: true,
          agentProfile: { select: { code: true } },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    ]);

    return {
      version: config?.version ?? 0,
      definition: config
        ? enrollmentFormDefinitionSchema.parse(config.definition)
        : structuredClone(defaultEnrollmentFormDefinition),
      receivingAgentId: config?.receivingAgentId ?? null,
      published: config?.publishedRevision
        ? {
            revisionId: config.publishedRevision.id,
            revisionNumber: config.publishedRevision.number,
          }
        : null,
      agents: agents.map((agent) => {
        return {
          id: agent.id,
          name: agent.name,
          agentCode: agent.agentProfile!.code,
        };
      }),
      updatedAt: config?.updatedAt.toISOString() ?? null,
    };
  }

  async config(user: User) {
    return this.db.$transaction(
      async (tx) => {
        await requireCurrentUser(tx, user, "ENROLLMENT_FORM_MANAGE");

        return this.configView(tx);
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  private async requireAgent(tx: Prisma.TransactionClient, id: string) {
    const agent = await tx.user.findFirst({
      where: { id, ...receivingAgentWhere },
      select: { id: true },
    });

    if (!agent) {
      throw new BadRequestException(
        "Choose an active Agent with an active agent profile.",
      );
    }
  }

  async updateConfig(user: User, input: EnrollmentFormUpdate) {
    return this.write(user, "ENROLLMENT_FORM_MANAGE", async (tx, current) => {
      const before = await tx.enrollmentFormConfig.findUnique({
        where: { id: "singleton" },
      });

      if ((before?.version ?? 0) !== input.version) {
        throw new ConflictException(
          "The form draft changed. Reload it before saving.",
        );
      }

      if (input.receivingAgentId) {
        await this.requireAgent(tx, input.receivingAgentId);
      }

      const data = {
        definition: json(input.definition),
        receivingAgentId: input.receivingAgentId,
      };

      const saved = before
        ? await tx.enrollmentFormConfig.update({
            where: { id: "singleton" },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.enrollmentFormConfig.create({
            data: { id: "singleton", ...data },
          });

      await tx.auditEntry.create({
        data: {
          actorId: current.id,
          action: "enrollment_form.saved",
          entity: "enrollment_form",
          recordId: "00000000-0000-4000-8000-000000000011",
          after: {
            version: saved.version,
            receivingAgentId: saved.receivingAgentId,
          },
        },
      });

      await tx.changeEvent.create({
        data: {
          entity: "enrollment_form",
          recordId: "00000000-0000-4000-8000-000000000011",
        },
      });

      return this.configView(tx);
    });
  }

  async publish(user: User, version: number) {
    return this.write(user, "ENROLLMENT_FORM_MANAGE", async (tx, current) => {
      const config = await tx.enrollmentFormConfig.findUnique({
        where: { id: "singleton" },
      });

      if (!config || config.version !== version) {
        throw new ConflictException(
          "The form draft changed. Save and reload it before publishing.",
        );
      }

      if (!config.receivingAgentId) {
        throw new BadRequestException(
          "Choose a receiving Agent before publishing.",
        );
      }

      await this.requireAgent(tx, config.receivingAgentId);

      const definition = enrollmentFormDefinitionSchema.parse(
        config.definition,
      );

      const latest = await tx.enrollmentFormRevision.aggregate({
        _max: { number: true },
      });

      const revision = await tx.enrollmentFormRevision.create({
        data: {
          number: (latest._max.number ?? 0) + 1,
          definition: json(definition),
          receivingAgentId: config.receivingAgentId,
        },
      });

      await tx.enrollmentFormConfig.update({
        where: { id: "singleton" },
        data: { publishedRevisionId: revision.id, version: { increment: 1 } },
      });

      await tx.auditEntry.create({
        data: {
          actorId: current.id,
          action: "enrollment_form.published",
          entity: "enrollment_form",
          recordId: revision.id,
          after: {
            revisionNumber: revision.number,
            receivingAgentId: revision.receivingAgentId,
          },
        },
      });

      await tx.changeEvent.create({
        data: { entity: "enrollment_form", recordId: revision.id },
      });

      return this.configView(tx);
    });
  }

  private async publishedRevision(tx: Prisma.TransactionClient) {
    const config = await tx.enrollmentFormConfig.findUnique({
      where: { id: "singleton" },
      include: { publishedRevision: true },
    });

    if (!config?.publishedRevision) {
      throw new NotFoundException(
        "Membership applications are not available yet.",
      );
    }

    const agent = await tx.user.findFirst({
      where: {
        id: config.publishedRevision.receivingAgentId,
        ...receivingAgentWhere,
      },
      select: { id: true },
    });

    if (!agent) {
      throw new ServiceUnavailableException(
        "Membership applications are temporarily unavailable. Please try again later.",
      );
    }

    return config.publishedRevision;
  }

  async published(): Promise<PublishedEnrollmentForm> {
    return this.db.$transaction(
      async (tx) => {
        const revision = await this.publishedRevision(tx);

        return {
          revisionId: revision.id,
          revisionNumber: revision.number,
          definition: enrollmentFormDefinitionSchema.parse(revision.definition),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  private answers(
    definition: Parameters<typeof validateEnrollmentAnswers>[0],
    answers: unknown,
  ) {
    const validated = validateEnrollmentAnswers(definition, answers);

    if (!validated.success) {
      throw new BadRequestException({
        message: "Check your answers and try again.",
        code: "ENROLLMENT_ANSWERS_INVALID",
        issues: validated.issues.slice(0, 60),
      });
    }

    return validated.data;
  }

  async submit(input: EnrollmentPublicSubmission) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      const existing = await tx.publicEnrollmentApplication.findUnique({
        where: { submissionId: input.submissionId },
        include: { revision: { select: { definition: true } } },
      });

      if (existing) {
        if (existing.retentionErasedAt) {
          throw new ConflictException(
            "This submission reference cannot be reused.",
          );
        }

        const answers = validateEnrollmentAnswers(
          enrollmentFormDefinitionSchema.parse(existing.revision.definition),
          input.answers,
        );

        if (
          existing.revisionId !== input.revisionId ||
          existing.name !== input.name ||
          existing.phone !== input.phone ||
          existing.email !== input.email ||
          !answers.success ||
          canonicalAnswers(existing.answers) !== canonicalAnswers(answers.data)
        ) {
          throw new ConflictException(
            "This submission reference has already been used. Start a new application to send different details.",
          );
        }

        return { reference: existing.id };
      }

      const revision = await this.publishedRevision(tx);

      if (revision.id !== input.revisionId) {
        throw new ConflictException({
          message:
            "The application form changed. Reload the current form before submitting.",
          code: "FORM_VERSION_CHANGED",
        });
      }

      const answers = this.answers(
        enrollmentFormDefinitionSchema.parse(revision.definition),
        input.answers,
      );

      const application = await tx.publicEnrollmentApplication.create({
        data: {
          submissionId: input.submissionId,
          revisionId: revision.id,
          name: input.name,
          phone: input.phone,
          email: input.email,
          answers: json(answers),
          assignedAgentId: revision.receivingAgentId,
        },
      });

      await applicationChanged(
        tx,
        application.id,
        null,
        "public_enrollment.received",
      );

      await notifyReceivingAgent(tx, application);

      return { reference: application.id };
    });
  }

  async applications(user: User, query: EnrollmentApplicationQuery) {
    return this.db.$transaction(
      async (tx) => {
        const current = await requireCurrentUser(
          tx,
          user,
          "ENROLLMENT_APPLICATION_READ",
        );

        const where: Prisma.PublicEnrollmentApplicationWhereInput = {
          AND: [
            applicationScope(current),
            { retentionErasedAt: null },
            query.status ? { status: query.status } : {},
            query.applicationId ? { id: query.applicationId } : {},
            query.q
              ? {
                  OR: ["name", "phone", "email"].map((field) => {
                    return {
                      [field]: { contains: query.q, mode: "insensitive" },
                    };
                  }),
                }
              : {},
          ],
        };

        const [rows, total] = await Promise.all([
          tx.publicEnrollmentApplication.findMany({
            where,
            include: applicationInclude,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * 20,
            take: 20,
          }),
          tx.publicEnrollmentApplication.count({ where }),
        ]);

        return {
          items: rows.map(applicationView),
          total,
          page: query.page,
          pageSize: 20,
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  async application(user: User, id: string) {
    return this.db.$transaction(
      async (tx) => {
        const current = await requireCurrentUser(
          tx,
          user,
          "ENROLLMENT_APPLICATION_READ",
        );

        const row = await tx.publicEnrollmentApplication.findFirst({
          where: { id, retentionErasedAt: null, ...applicationScope(current) },
          include: applicationInclude,
        });

        if (!row) {
          throw new NotFoundException("Enrollment application not found.");
        }

        return applicationView(row);
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  async forward(user: User, id: string, input: EnrollmentApplicationForward) {
    const { version, ...contact } = input;

    return this.workspace.submit(
      user,
      { ...contact, submissionId: id },
      { id, version },
    );
  }

  async close(
    user: User,
    id: string,
    input: { version: number; reason: string },
  ) {
    return this.write(
      user,
      "ENROLLMENT_APPLICATION_MANAGE",
      async (tx, current) => {
        const previous = await tx.publicEnrollmentApplication.findFirst({
          where: { id, retentionErasedAt: null, ...applicationScope(current) },
        });

        if (!previous) {
          throw new NotFoundException("Enrollment application not found.");
        }

        if (
          previous.status !== "RECEIVED" ||
          previous.version !== input.version
        ) {
          throw new ConflictException(
            "This application changed or was already reviewed. Reload it before continuing.",
          );
        }

        await tx.publicEnrollmentApplication.update({
          where: { id },
          data: {
            status: "CLOSED",
            closeReason: input.reason,
            version: { increment: 1 },
          },
        });

        await applicationChanged(
          tx,
          id,
          current.id,
          "public_enrollment.closed",
          { status: "CLOSED" },
        );

        return applicationView(
          await tx.publicEnrollmentApplication.findUniqueOrThrow({
            where: { id },
            include: applicationInclude,
          }),
        );
      },
    );
  }

  async assign(
    user: User,
    id: string,
    input: { version: number; agentId: string },
  ) {
    return this.write(
      user,
      "ENROLLMENT_APPLICATION_MANAGE",
      async (tx, current) => {
        if (businessRole(current.role) !== "COO") {
          throw new ForbiddenException(
            "Only the COO may reassign received applications.",
          );
        }

        await this.requireAgent(tx, input.agentId);

        const previous = await tx.publicEnrollmentApplication.findFirst({
          where: { id, retentionErasedAt: null },
        });

        if (!previous) {
          throw new NotFoundException("Enrollment application not found.");
        }

        if (
          previous.status !== "RECEIVED" ||
          previous.version !== input.version
        ) {
          throw new ConflictException(
            "This application changed or was already reviewed. Reload it before continuing.",
          );
        }

        const changed = await tx.publicEnrollmentApplication.update({
          where: { id },
          data: { assignedAgentId: input.agentId, version: { increment: 1 } },
        });

        await applicationChanged(
          tx,
          id,
          current.id,
          "public_enrollment.assigned",
          { assignedAgentId: input.agentId },
        );

        await notifyReceivingAgent(tx, changed);

        return applicationView(
          await tx.publicEnrollmentApplication.findUniqueOrThrow({
            where: { id },
            include: applicationInclude,
          }),
        );
      },
    );
  }
}
