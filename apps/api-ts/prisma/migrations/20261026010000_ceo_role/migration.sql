-- Commit the enum addition before using the new value in the following migration.
ALTER TYPE "Role" ADD VALUE 'CEO' BEFORE 'OWNER';
