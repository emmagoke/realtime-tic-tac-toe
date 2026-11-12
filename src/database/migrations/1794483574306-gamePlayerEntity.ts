import { MigrationInterface, QueryRunner } from "typeorm";

export class GamePlayerEntity1794483574306 implements MigrationInterface {
    name = 'GamePlayerEntity1794483574306'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "game_players" ("id" SERIAL NOT NULL, "gameId" uuid NOT NULL, "playerId" uuid NOT NULL, "mark" character varying(1) NOT NULL, CONSTRAINT "UQ_5d2e8ce2659a1ab5b6637bef988" UNIQUE ("gameId", "mark"), CONSTRAINT "UQ_abf144434302d27ad0307a4b3cf" UNIQUE ("gameId", "playerId"), CONSTRAINT "PK_a99af25a1c97122f04ba778197c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "games" ALTER COLUMN "board" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "game_players" ADD CONSTRAINT "FK_66d478167a4c11e2ad1ba74e52f" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "game_players" ADD CONSTRAINT "FK_58e348072733ba21f07f4feca2f" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_58e348072733ba21f07f4feca2f"`);
        await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_66d478167a4c11e2ad1ba74e52f"`);
        await queryRunner.query(`ALTER TABLE "games" ALTER COLUMN "board" SET DEFAULT '["", "", "", "", "", "", "", "", ""]'`);
        await queryRunner.query(`DROP TABLE "game_players"`);
    }

}
