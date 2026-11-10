import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { gcashReadingSchema, type GcashReading } from "@freshphones/contracts";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const messages: Record<string, string> = {
  PASSWORD_REQUIRED:
    "This PDF needs a password. Enter its PDF password and try again.",
  PASSWORD_INCORRECT: "The PDF password is incorrect. Check it and try again.",
  PAGE_LIMIT: "Use a PDF with at most 20 pages.",
  LIMIT: "This PDF is too large or complex to read. Use a shorter statement.",
  TIMEOUT: "Reading this PDF took too long. Try a shorter statement.",
  UNREADABLE:
    "This PDF could not be opened or read. Check the file and try again.",
};

@Injectable()
export class GcashPdfService {
  private busy = false;

  async read(pdf: Buffer, password = ""): Promise<GcashReading> {
    if (this.busy) {
      throw new ServiceUnavailableException(
        "The PDF reader is busy. Please try again shortly.",
      );
    }

    this.busy = true;

    let directory: string | undefined;

    try {
      directory = await mkdtemp(join(tmpdir(), "freshphones-gcash-reader-"));

      return await this.run(pdf, password, directory);
    } finally {
      try {
        if (directory) {
          await rm(directory, { recursive: true, force: true });
        }
      } finally {
        this.busy = false;
      }
    }
  }

  private run(
    pdf: Buffer,
    password: string,
    directory: string,
  ): Promise<GcashReading> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        process.env.GCASH_PYTHON_BIN ?? "python3",
        [join(__dirname, "../../scripts/gcash_pdf.py")],
        {
          stdio: ["pipe", "pipe", "pipe"],
          detached: true,
          env: {
            ...process.env,
            OMP_THREAD_LIMIT: "1",
            PYTHONDONTWRITEBYTECODE: "1",
            GCASH_TMP_ROOT: directory,
          },
        },
      );

      const output: Buffer[] = [];

      let bytes = 0;

      let stopped = false;

      const kill = () => {
        if (child.pid) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
        }
      };

      const fail = (error: Error) => {
        if (!stopped) {
          stopped = true;

          clearTimeout(timer);

          child.once("close", () => {
            reject(error);
          });

          kill();
        }
      };

      const timer = setTimeout(() => {
        fail(new BadRequestException(messages.TIMEOUT));
      }, 95_000);

      child.stdout.on("data", (chunk: Buffer) => {
        bytes += chunk.length;

        if (bytes > 4 * 1024 * 1024) {
          fail(new BadRequestException(messages.LIMIT));

          return;
        }

        output.push(chunk);
      });

      // Parser diagnostics may contain document contents. Never return or log them.
      child.stderr.resume();

      child.stdin.on("error", () => {});

      child.on("error", () => {
        fail(
          new ServiceUnavailableException(
            "PDF reading is unavailable. Please try again later.",
          ),
        );
      });

      child.on("close", (code) => {
        if (stopped) {
          return;
        }

        stopped = true;

        clearTimeout(timer);

        try {
          const result = JSON.parse(Buffer.concat(output).toString()) as {
            error?: string;
          };

          if (result.error === "UNAVAILABLE") {
            reject(
              new ServiceUnavailableException(
                "PDF reading is unavailable. Please try again later.",
              ),
            );
          } else if (result.error || code) {
            reject(
              new BadRequestException(
                messages[result.error ?? "UNREADABLE"] ?? messages.UNREADABLE,
              ),
            );
          } else {
            const parsed = gcashReadingSchema.safeParse(result);

            if (!parsed.success) {
              reject(new BadRequestException(messages.UNREADABLE));
            } else {
              resolve(parsed.data);
            }
          }
        } catch {
          reject(new BadRequestException(messages.UNREADABLE));
        }
      });

      // Passwords never enter command arguments, temporary files, audit records or storage.
      child.stdin.write(JSON.stringify({ password }) + "\n");

      child.stdin.end(pdf);
    });
  }
}
