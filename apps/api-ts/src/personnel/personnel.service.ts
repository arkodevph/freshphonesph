import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  personnelRoles,
  type PersonnelListQuery,
  type PersonnelSubmission,
  type User,
} from "@freshphones/contracts";
import { allowed, requireCurrentUser } from "../auth/access";
import { hashPassword } from "../auth/password";
import { replayCooWrite } from "../coo-security/request-replay";
import { Database } from "../database";
import { Prisma } from "../generated/prisma/client";
import { notifyAccount } from "../staff/account-alerts";

const include = {
  submittedBy: { select: { id: true, name: true } },
  supervisor: { select: { id: true, name: true } },
  decidedBy: { select: { id: true, name: true } },
  account: { select: { id: true, name: true, role: true, active: true } },
} satisfies Prisma.PersonnelOnboardingInclude;

type Row = Prisma.PersonnelOnboardingGetPayload<{ include: typeof include }>;

const superiorRoles: Record<(typeof personnelRoles)[number], User["role"][]> = {
  BATCH_MANAGER: ["COO"],
  HR_PAYROLL: ["COO"],
  FINANCE_OFFICER: ["COO"],
  RECORDS: ["COO"],
  KPI_OFFICER: ["COO"],
  OPERATIONS_COORDINATOR: ["COO"],
  CSR: ["COO"],
  PIONEER_AGENT: ["OPERATIONS_COORDINATOR"],
  AGENT: ["PIONEER_AGENT"],
  BATCH_HANDLER: ["BATCH_MANAGER", "GENERAL_MANAGER"],
};

function view(row: Row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    supervisorId: row.supervisorId,
    supervisor: row.supervisor,
    orientationCompletedAt: row.orientationCompletedAt.toISOString(),
    trainingCompletedAt: row.trainingCompletedAt.toISOString(),
    confirmedBy: row.confirmedBy,
    evidenceNote: row.evidenceNote,
    status: row.status,
    version: row.version,
    submittedBy: row.submittedBy,
    decidedBy: row.decidedBy,
    account: row.account,
    decisionReason: row.decisionReason,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

const json = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value));
};

@Injectable()
export class PersonnelService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private async current(user: User) {
    const current = await requireCurrentUser(this.db, user, "HR_CONFIDENTIAL");

    if (!["HR_PAYROLL", "COO", "SYSTEM_ADMIN"].includes(current.role)) {
      throw new ForbiddenException(
        "Confidential personnel access is required.",
      );
    }

    return current;
  }

  private async write<T>(
    user: User,
    role: "HR_PAYROLL" | "COO",
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      // Same ordering lock as role changes and other audited account writes.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      const current = await tx.user.findUnique({ where: { id: user.id } });

      if (
        !current?.active ||
        current.role !== role ||
        !allowed(current, "HR_CONFIDENTIAL") ||
        (role === "COO" && !allowed(current, "ACCOUNT_MANAGE"))
      ) {
        throw new ForbiddenException(
          role === "COO"
            ? "An approved COO must create personnel accounts."
            : "Approved HR staff must submit training evidence.",
        );
      }

      return replayCooWrite(tx, user.id, () => {
        return run(tx);
      });
    });
  }

  async list(user: User, query: PersonnelListQuery) {
    await this.current(user);

    const where: Prisma.PersonnelOnboardingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { email: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.db.$transaction(
      [
        this.db.personnelOnboarding.findMany({
          where,
          include,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * 20,
          take: 20,
        }),
        this.db.personnelOnboarding.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );

    return { items: items.map(view), total, page: query.page, pageSize: 20 };
  }

  async options(user: User) {
    const current = await this.current(user);

    const supervisors = await this.db.user.findMany({
      where: {
        active: true,
        role: {
          in: [
            "COO",
            "OPERATIONS_COORDINATOR",
            "PIONEER_AGENT",
            "BATCH_MANAGER",
            "GENERAL_MANAGER",
          ],
        },
      },
      select: { id: true, name: true, role: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    const profiles =
      current.role === "COO"
        ? await this.db.agent.findMany({
            where: { active: true, account: { is: null } },
            select: { id: true, name: true, code: true },
            orderBy: [{ name: "asc" }, { id: "asc" }],
          })
        : [];

    return { roles: personnelRoles, superiorRoles, supervisors, profiles };
  }

  private async supervisor(
    tx: Prisma.TransactionClient,
    input: { role: string; supervisorId: string },
  ) {
    const roles = superiorRoles[input.role as keyof typeof superiorRoles];

    if (
      !roles ||
      !(await tx.user.findFirst({
        where: { id: input.supervisorId, active: true, role: { in: roles } },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException(
        "Choose an active supervisor for the requested personnel role.",
      );
    }
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actorId: string,
    row: Row,
    action: string,
  ) {
    await tx.auditEntry.create({
      data: {
        actorId,
        entity: "personnel_onboarding",
        recordId: row.id,
        action,
        after: json(view(row)),
      },
    });
  }

  async submit(user: User, input: PersonnelSubmission) {
    return this.write(user, "HR_PAYROLL", async (tx) => {
      const existing = await tx.personnelOnboarding.findUnique({
        where: { submissionId: input.submissionId },
        include,
      });

      if (existing) {
        const original = {
          ...view(existing),
          submissionId: existing.submissionId,
        };

        if (
          existing.submittedById !== user.id ||
          Object.entries(input).some(([key, value]) => {
            const previous = original[key as keyof typeof original];

            return (
              (key.endsWith("CompletedAt")
                ? new Date(value).toISOString()
                : value) !== previous
            );
          })
        ) {
          throw new ConflictException(
            "This submission ID was used for different training evidence.",
          );
        }

        return view(existing);
      }

      if (
        [input.orientationCompletedAt, input.trainingCompletedAt].some(
          (value) => {
            return new Date(value).getTime() > Date.now();
          },
        )
      ) {
        throw new BadRequestException(
          "Completion dates cannot be in the future.",
        );
      }

      await this.supervisor(tx, input);

      if (
        (await tx.user.findFirst({
          where: { email: { equals: input.email, mode: "insensitive" } },
          select: { id: true },
        })) ||
        (await tx.personnelOnboarding.findFirst({
          where: { email: input.email, status: "PENDING" },
          select: { id: true },
        }))
      ) {
        throw new ConflictException(
          "This email already has an account or pending personnel enrollment.",
        );
      }

      const row = await tx.personnelOnboarding.create({
        data: { ...input, submittedById: user.id },
        include,
      });

      await this.audit(tx, user.id, row, "personnel.training_submitted");

      return view(row);
    });
  }

  private async pending(
    tx: Prisma.TransactionClient,
    id: string,
    version: number,
  ) {
    const row = await tx.personnelOnboarding.findUnique({
      where: { id },
      include,
    });

    if (!row) {
      throw new NotFoundException("Personnel enrollment not found.");
    }

    if (row.version !== version || row.status !== "PENDING") {
      throw new ConflictException(
        "This enrollment has changed. Refresh before deciding.",
      );
    }

    return row;
  }

  async reject(
    user: User,
    id: string,
    input: { version: number; reason: string },
  ) {
    return this.write(user, "COO", async (tx) => {
      await this.pending(tx, id, input.version);

      const row = await tx.personnelOnboarding.update({
        where: { id },
        data: {
          status: "REJECTED",
          decisionReason: input.reason,
          decidedById: user.id,
          decidedAt: new Date(),
          version: { increment: 1 },
        },
        include,
      });

      await this.audit(tx, user.id, row, "personnel.enrollment_rejected");

      return view(row);
    });
  }

  async enroll(
    user: User,
    id: string,
    input: { version: number; password: string; agentProfileId?: string },
  ) {
    const passwordHash = await hashPassword(input.password);

    return this.write(user, "COO", async (tx) => {
      const before = await this.pending(tx, id, input.version);

      if (before.submittedById === user.id) {
        throw new ForbiddenException(
          "You cannot approve your own personnel submission.",
        );
      }

      await this.supervisor(tx, before);

      if ((before.role === "AGENT") !== Boolean(input.agentProfileId)) {
        throw new BadRequestException(
          "Agent enrollment requires an available Agent profile; other roles cannot link one.",
        );
      }

      if (
        input.agentProfileId &&
        !(await tx.agent.findFirst({
          where: {
            id: input.agentProfileId,
            active: true,
            account: { is: null },
          },
          select: { id: true },
        }))
      ) {
        throw new ConflictException(
          "Choose an active, available Agent profile.",
        );
      }

      if (
        await tx.user.findFirst({
          where: { email: { equals: before.email, mode: "insensitive" } },
          select: { id: true },
        })
      ) {
        throw new ConflictException("This email already has an account.");
      }

      const account = await tx.user.create({
        data: {
          name: before.name,
          email: before.email,
          role: before.role,
          passwordHash,
          supervisorId: before.supervisorId,
          agentProfileId: input.agentProfileId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          version: true,
          supervisorId: true,
          agentProfileId: true,
        },
      });

      const row = await tx.personnelOnboarding.update({
        where: { id },
        data: {
          status: "ENROLLED",
          accountId: account.id,
          decidedById: user.id,
          decidedAt: new Date(),
          version: { increment: 1 },
        },
        include,
      });

      await tx.auditEntry.create({
        data: {
          actorId: user.id,
          action: "account.created",
          entity: "account",
          recordId: account.id,
          after: json({ ...account, personnelOnboardingId: id }),
        },
      });

      await tx.changeEvent.create({
        data: { entity: "account", recordId: account.id },
      });

      await notifyAccount(tx, user, null, account);

      await this.audit(tx, user.id, row, "personnel.enrolled");

      return view(row);
    });
  }

  async history(user: User, id: string) {
    await this.current(user);

    if (
      !(await this.db.personnelOnboarding.findUnique({
        where: { id },
        select: { id: true },
      }))
    ) {
      throw new NotFoundException("Personnel enrollment not found.");
    }

    return this.db.auditEntry.findMany({
      where: { entity: "personnel_onboarding", recordId: id },
      select: {
        id: true,
        action: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
        after: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }
}
