import { MigrationInterface, QueryRunner } from "typeorm";

export class IsTieColumGameEntity1794919479929 implements MigrationInterface {
    name = 'IsTieColumGameEntity1794919479929'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "games" ADD "isTie" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "isTie"`);
    }

}
