/*
  Warnings:

  - Added the required column `name` to the `Like` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Like` ADD COLUMN `name` VARCHAR(255) DEFAULT NULL;
