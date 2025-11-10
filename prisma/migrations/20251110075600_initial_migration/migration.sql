-- CreateTable
CREATE TABLE `sensors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `unit` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sensor_readings` (
    `id` VARCHAR(191) NOT NULL,
    `sensor_id` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sensor_readings_sensor_id_idx`(`sensor_id`),
    INDEX `sensor_readings_recorded_at_idx`(`recorded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `actuators` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `actuator_commands` (
    `id` VARCHAR(191) NOT NULL,
    `actuator_id` VARCHAR(191) NOT NULL,
    `command` VARCHAR(255) NOT NULL,
    `issued_by` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `actuator_commands_actuator_id_idx`(`actuator_id`),
    INDEX `actuator_commands_issued_at_idx`(`issued_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sensor_readings` ADD CONSTRAINT `sensor_readings_sensor_id_fkey` FOREIGN KEY (`sensor_id`) REFERENCES `sensors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `actuator_commands` ADD CONSTRAINT `actuator_commands_actuator_id_fkey` FOREIGN KEY (`actuator_id`) REFERENCES `actuators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
