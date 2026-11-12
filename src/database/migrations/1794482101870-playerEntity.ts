import { MigrationInterface, QueryRunner } from "typeorm";

export class PlayerEntity1794482101870 implements MigrationInterface {
    name = 'PlayerEntity1794482101870'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "players" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_de22b8fdeee0c33ab55ae71da3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "games" ALTER COLUMN "board" SET DEFAULT '["","","","","","","","",""]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "games" ALTER COLUMN "board" SET DEFAULT '["", "", "", "", "", "", "", "", ""]'`);
        await queryRunner.query(`DROP TABLE "players"`);
    }

}
