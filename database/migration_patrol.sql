-- ============================================
-- 巡检管理模块数据库迁移脚本
-- ============================================

-- 巡检路线表
CREATE TABLE IF NOT EXISTS patrol_route (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    route_code VARCHAR(50) NOT NULL COMMENT '路线编号',
    route_name VARCHAR(100) NOT NULL COMMENT '路线名称',
    description TEXT COMMENT '路线描述',
    estimated_duration INT DEFAULT 0 COMMENT '预计时长(分钟)',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态: active启用/inactive停用',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_route_code (route_code),
    INDEX idx_status (status),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='巡检路线表';

-- 巡检检查点表
CREATE TABLE IF NOT EXISTS patrol_checkpoint (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    route_id BIGINT COMMENT '所属路线ID',
    checkpoint_name VARCHAR(100) NOT NULL COMMENT '检查点名称',
    equipment_id BIGINT COMMENT '关联设备ID',
    location VARCHAR(200) COMMENT '位置描述',
    sort_order INT DEFAULT 0 COMMENT '排序序号',
    remark TEXT COMMENT '备注',
    status TINYINT DEFAULT 1 COMMENT '状态: 0删除/1正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_route_id (route_id),
    INDEX idx_equipment_id (equipment_id),
    INDEX idx_sort_order (sort_order),
    INDEX idx_status (status),
    CONSTRAINT fk_patrol_checkpoint_route FOREIGN KEY (route_id) REFERENCES patrol_route(id) ON DELETE CASCADE,
    CONSTRAINT fk_patrol_checkpoint_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='巡检检查点表';

-- 巡检项表
CREATE TABLE IF NOT EXISTS patrol_item (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    checkpoint_id BIGINT COMMENT '所属检查点ID',
    item_name VARCHAR(100) NOT NULL COMMENT '项目名',
    expected_value VARCHAR(200) COMMENT '期望值/标准',
    unit VARCHAR(20) COMMENT '单位',
    is_required TINYINT DEFAULT 1 COMMENT '是否必填: 0否/1是',
    item_type ENUM('input', 'select', 'checkbox') DEFAULT 'input' COMMENT '录入类型',
    options TEXT COMMENT '选项值(JSON格式)',
    sort_order INT DEFAULT 0 COMMENT '排序序号',
    status TINYINT DEFAULT 1 COMMENT '状态: 0删除/1正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_checkpoint_id (checkpoint_id),
    INDEX idx_sort_order (sort_order),
    INDEX idx_status (status),
    CONSTRAINT fk_patrol_item_checkpoint FOREIGN KEY (checkpoint_id) REFERENCES patrol_checkpoint(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='巡检项表';

-- 巡检计划表
CREATE TABLE IF NOT EXISTS patrol_plan (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    plan_code VARCHAR(50) NOT NULL COMMENT '计划编号',
    plan_name VARCHAR(100) NOT NULL COMMENT '计划名称',
    route_id BIGINT COMMENT '巡检路线ID',
    person_in_charge VARCHAR(50) COMMENT '负责人',
    team VARCHAR(100) COMMENT '负责班组',
    frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily' COMMENT '频率: daily每日/weekly每周/monthly每月',
    week_days VARCHAR(20) COMMENT '周几执行(1-7,逗号分隔)',
    month_days VARCHAR(50) COMMENT '每月几号执行(1-31,逗号分隔)',
    execute_time VARCHAR(10) DEFAULT '08:00' COMMENT '执行时间(HH:MM)',
    start_date DATE COMMENT '生效开始日期',
    end_date DATE COMMENT '生效结束日期',
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active' COMMENT '状态: active启用/inactive停用/expired已过期',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_plan_code (plan_code),
    INDEX idx_route_id (route_id),
    INDEX idx_frequency (frequency),
    INDEX idx_status (status),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    CONSTRAINT fk_patrol_plan_route FOREIGN KEY (route_id) REFERENCES patrol_route(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='巡检计划表';

-- 巡检任务实例表
CREATE TABLE IF NOT EXISTS patrol_task (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    task_code VARCHAR(50) NOT NULL COMMENT '任务编号',
    plan_id BIGINT COMMENT '所属计划ID',
    route_id BIGINT COMMENT '巡检路线ID',
    executor VARCHAR(50) COMMENT '执行人',
    status ENUM('pending', 'in_progress', 'completed', 'overdue') DEFAULT 'pending' COMMENT '状态: pending待执行/in_progress进行中/completed已完成/overdue已逾期',
    plan_date DATE COMMENT '计划日期',
    due_time DATETIME COMMENT '应完成时间',
    start_time DATETIME COMMENT '实际开始时间',
    end_time DATETIME COMMENT '实际完成时间',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_task_code (task_code),
    INDEX idx_plan_id (plan_id),
    INDEX idx_route_id (route_id),
    INDEX idx_executor (executor),
    INDEX idx_status (status),
    INDEX idx_plan_date (plan_date),
    INDEX idx_due_time (due_time),
    CONSTRAINT fk_patrol_task_plan FOREIGN KEY (plan_id) REFERENCES patrol_plan(id) ON DELETE SET NULL,
    CONSTRAINT fk_patrol_task_route FOREIGN KEY (route_id) REFERENCES patrol_route(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='巡检任务实例表';

-- 巡检结果表
CREATE TABLE IF NOT EXISTS patrol_result (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    task_id BIGINT COMMENT '所属任务ID',
    checkpoint_id BIGINT COMMENT '检查点ID',
    item_id BIGINT COMMENT '巡检项ID',
    actual_value TEXT COMMENT '实际填写值',
    is_abnormal TINYINT DEFAULT 0 COMMENT '是否异常: 0否/1是',
    remark TEXT COMMENT '备注',
    images TEXT COMMENT '现场图片(base64列表,JSON格式)',
    status TINYINT DEFAULT 1 COMMENT '状态: 0删除/1正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_task_id (task_id),
    INDEX idx_checkpoint_id (checkpoint_id),
    INDEX idx_item_id (item_id),
    INDEX idx_is_abnormal (is_abnormal),
    INDEX idx_status (status),
    CONSTRAINT fk_patrol_result_task FOREIGN KEY (task_id) REFERENCES patrol_task(id) ON DELETE CASCADE,
    CONSTRAINT fk_patrol_result_checkpoint FOREIGN KEY (checkpoint_id) REFERENCES patrol_checkpoint(id) ON DELETE SET NULL,
    CONSTRAINT fk_patrol_result_item FOREIGN KEY (item_id) REFERENCES patrol_item(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='巡检结果表';

-- 插入示例巡检路线数据
INSERT INTO patrol_route (route_code, route_name, description, estimated_duration, status) VALUES
('ROUTE001', '主生产线巡检路线', '负责主生产线关键设备的日常巡检', 60, 'active'),
('ROUTE002', '辅助设备巡检路线', '辅助设备及周边环境的巡检', 45, 'active'),
('ROUTE003', '安全消防巡检路线', '消防设施和安全通道的巡检', 30, 'active')
ON DUPLICATE KEY UPDATE route_name = VALUES(route_name);

-- 插入示例检查点数据
INSERT INTO patrol_checkpoint (route_id, checkpoint_name, equipment_id, location, sort_order, remark) VALUES
(1, '组装机器人1号检查点', 1, '车间1-区域A', 0, '核心生产设备'),
(1, '组装机器人2号检查点', 2, '车间1-区域A', 1, '核心生产设备'),
(1, '输送带1号检查点', 5, '车间1-区域B', 2, '物料传输设备'),
(2, '包装机1号检查点', 3, '车间2-区域C', 0, '成品包装设备'),
(2, '检测仪1号检查点', 4, '车间1-质检区', 1, '质量检测设备'),
(3, '消防栓检查点1', NULL, '车间1-东门', 0, '消防设施检查'),
(3, '灭火器检查点1', NULL, '车间1-中控室旁', 1, '消防设施检查')
ON DUPLICATE KEY UPDATE checkpoint_name = VALUES(checkpoint_name);

-- 插入示例巡检项数据
INSERT INTO patrol_item (checkpoint_id, item_name, expected_value, unit, is_required, item_type, sort_order) VALUES
(1, '设备运行状态', '正常', '', 1, 'select', 0),
(1, '表面温度', '<60', '°C', 1, 'input', 1),
(1, '运行声音', '无异响', '', 0, 'input', 2),
(2, '设备运行状态', '正常', '', 1, 'select', 0),
(2, '表面温度', '<60', '°C', 1, 'input', 1),
(2, '运行速度', '100-150', 'm/min', 1, 'input', 2),
(3, '皮带状态', '无磨损、无跑偏', '', 1, 'input', 0),
(3, '运行速度', '120-180', 'm/min', 1, 'input', 1),
(4, '包装精度', '±0.5%', '%', 1, 'input', 0),
(4, '设备温度', '<50', '°C', 1, 'input', 1),
(5, '检测精度', '99.5%', '%', 1, 'input', 0),
(5, '校准状态', '已校准', '', 1, 'select', 1),
(6, '水压', '正常', '', 1, 'select', 0),
(6, '外观', '完好、无损坏', '', 1, 'input', 1),
(7, '压力值', '1.2-1.5', 'MPa', 1, 'input', 0),
(7, '有效期', '>30', '天', 1, 'input', 1)
ON DUPLICATE KEY UPDATE item_name = VALUES(item_name);

-- 插入示例巡检计划数据
INSERT INTO patrol_plan (plan_code, plan_name, route_id, person_in_charge, team, frequency, week_days, execute_time, start_date, status, remark) VALUES
('PLAN001', '主生产线每日巡检', 1, '张三', '甲班', 'daily', '', '08:00', CURDATE(), 'active', '每日早班执行'),
('PLAN002', '辅助设备每周巡检', 2, '李四', '乙班', 'weekly', '1,3,5', '14:00', CURDATE(), 'active', '每周一、三、五执行'),
('PLAN003', '安全消防月度巡检', 3, '王五', '安全组', 'monthly', '', '15:00', CURDATE(), 'active', '每月1号执行')
ON DUPLICATE KEY UPDATE plan_name = VALUES(plan_name);

SELECT '巡检管理模块数据库迁移完成!' as message;
