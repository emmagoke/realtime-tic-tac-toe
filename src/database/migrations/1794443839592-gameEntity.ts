import { MigrationInterface, QueryRunner } from "typeorm";

export class GameEntity1794443839592 implements MigrationInterface {
    name = 'GameEntity1794443839592'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "games" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(4) NOT NULL, "board" jsonb NOT NULL DEFAULT '["","","","","","","","",""]', "currentTurn" character varying(1) NOT NULL DEFAULT 'X', "status" character varying NOT NULL DEFAULT 'waiting', "winner" character varying, "winningLine" jsonb, "scoreX" integer NOT NULL DEFAULT '0', "scoreO" integer NOT NULL DEFAULT '0', "scoreTie" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6048911d5f44406ad25e44eaaed" UNIQUE ("code"), CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "games"`);
    }

}
