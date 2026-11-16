import { MigrationInterface, QueryRunner } from "typeorm";

export class RoundEntity1794831628516 implements MigrationInterface {
    name = 'RoundEntity1794831628516'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "rounds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gameId" uuid NOT NULL, "roundNumber" integer NOT NULL, "winnerId" uuid, "isTie" boolean NOT NULL DEFAULT false, "winningLine" jsonb, "startedAt" TIMESTAMP NOT NULL DEFAULT now(), "finishedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_398edfa07ffe5d2104a3422190d" UNIQUE ("gameId", "roundNumber"), CONSTRAINT "PK_9d254884a20817016e2f877c7e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "rounds" ADD CONSTRAINT "FK_cc567777a54c03ebb6cfb6bdd7d" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rounds" ADD CONSTRAINT "FK_dd3932b3737217ba32bce902947" FOREIGN KEY ("winnerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rounds" DROP CONSTRAINT "FK_dd3932b3737217ba32bce902947"`);
        await queryRunner.query(`ALTER TABLE "rounds" DROP CONSTRAINT "FK_cc567777a54c03ebb6cfb6bdd7d"`);
        await queryRunner.query(`DROP TABLE "rounds"`);
    }

}
