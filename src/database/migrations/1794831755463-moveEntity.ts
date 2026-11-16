import { MigrationInterface, QueryRunner } from "typeorm";

export class MoveEntity1794831755463 implements MigrationInterface {
    name = 'MoveEntity1794831755463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "moves" ("id" SERIAL NOT NULL, "roundId" uuid NOT NULL, "playerId" uuid NOT NULL, "mark" character varying(1) NOT NULL, "moveNumber" integer NOT NULL, "cellIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4ee847bfe36217a283038f77866" UNIQUE ("roundId", "cellIndex"), CONSTRAINT "UQ_153ec376741f61eb820b63f2ee8" UNIQUE ("roundId", "moveNumber"), CONSTRAINT "PK_fcbf4e07f988d7d37d00e933133" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "moves" ADD CONSTRAINT "FK_b7616c0a5db588a8be46c01271b" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "moves" ADD CONSTRAINT "FK_267fd1f434726d26cfd7de5d9ee" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "moves" DROP CONSTRAINT "FK_267fd1f434726d26cfd7de5d9ee"`);
        await queryRunner.query(`ALTER TABLE "moves" DROP CONSTRAINT "FK_b7616c0a5db588a8be46c01271b"`);
        await queryRunner.query(`DROP TABLE "moves"`);
    }

}
