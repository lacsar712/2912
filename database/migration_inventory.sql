-- ============================================
-- 库存管理模块数据库迁移脚本
-- ============================================

-- 物料档案表
CREATE TABLE IF NOT EXISTS material (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编号',
    material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
    specification VARCHAR(200) COMMENT '规格',
    unit VARCHAR(20) COMMENT '单位',
    category VARCHAR(50) COMMENT '所属类目',
    safety_stock DECIMAL(12,2) DEFAULT 0 COMMENT '安全库存',
    current_stock DECIMAL(12,2) DEFAULT 0 COMMENT '当前库存',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态: active正常/inactive停用',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_material_code (material_code),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_stock (current_stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料档案表';

-- 入库单表
CREATE TABLE IF NOT EXISTS stock_in (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    order_code VARCHAR(50) NOT NULL COMMENT '入库单号',
    source VARCHAR(100) COMMENT '来源',
    material_id BIGINT COMMENT '物料ID',
    batch_no VARCHAR(50) COMMENT '批次号',
    quantity DECIMAL(12,2) NOT NULL COMMENT '入库数量',
    operator VARCHAR(50) COMMENT '操作人',
    in_time DATETIME COMMENT '入库时间',
    remark TEXT COMMENT '备注',
    status TINYINT DEFAULT 1 COMMENT '状态: 0删除/1正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_order_code (order_code),
    INDEX idx_material_id (material_id),
    INDEX idx_in_time (in_time),
    INDEX idx_status (status),
    CONSTRAINT fk_stock_in_material FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入库单表';

-- 出库单表
CREATE TABLE IF NOT EXISTS stock_out (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    order_code VARCHAR(50) NOT NULL COMMENT '出库单号',
    department VARCHAR(100) COMMENT '领用部门/任务',
    material_id BIGINT COMMENT '物料ID',
    batch_no VARCHAR(50) COMMENT '批次号',
    quantity DECIMAL(12,2) NOT NULL COMMENT '出库数量',
    operator VARCHAR(50) COMMENT '操作人',
    out_time DATETIME COMMENT '出库时间',
    purpose TEXT COMMENT '用途',
    status TINYINT DEFAULT 1 COMMENT '状态: 0删除/1正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_order_code (order_code),
    INDEX idx_material_id (material_id),
    INDEX idx_out_time (out_time),
    INDEX idx_status (status),
    CONSTRAINT fk_stock_out_material FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库单表';

-- 库存流水表
CREATE TABLE IF NOT EXISTS stock_flow (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    flow_code VARCHAR(50) NOT NULL COMMENT '流水号',
    flow_type ENUM('in', 'out') COMMENT '流水类型: in入库/out出库',
    material_id BIGINT COMMENT '物料ID',
    batch_no VARCHAR(50) COMMENT '批次号',
    quantity DECIMAL(12,2) NOT NULL COMMENT '变动数量',
    stock_before DECIMAL(12,2) COMMENT '变动前库存',
    stock_after DECIMAL(12,2) COMMENT '变动后库存',
    operator VARCHAR(50) COMMENT '操作人',
    operate_time DATETIME COMMENT '操作时间',
    related_order VARCHAR(50) COMMENT '关联单据号',
    remark TEXT COMMENT '备注',
    status TINYINT DEFAULT 1 COMMENT '状态: 0删除/1正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_flow_code (flow_code),
    INDEX idx_material_id (material_id),
    INDEX idx_flow_type (flow_type),
    INDEX idx_operate_time (operate_time),
    INDEX idx_status (status),
    CONSTRAINT fk_stock_flow_material FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存流水表';

-- 插入示例物料数据
INSERT INTO material (material_code, material_name, specification, unit, category, safety_stock, current_stock, status) VALUES
('MAT001', '钢板', 'Q235 2mm', '张', '原材料', 100, 150, 'active'),
('MAT002', '钢管', 'Φ50×3mm', '根', '原材料', 50, 30, 'active'),
('MAT003', '螺栓', 'M10×50', '个', '零配件', 500, 200, 'active'),
('MAT004', '螺母', 'M10', '个', '零配件', 500, 600, 'active'),
('MAT005', '垫圈', 'Φ10', '个', '零配件', 1000, 800, 'active'),
('MAT006', '油漆', '防锈漆 红色', '桶', '辅助材料', 20, 15, 'active'),
('MAT007', '机油', '5W-30', '桶', '辅助材料', 10, 5, 'active'),
('MAT008', '砂纸', 'P240', '张', '辅助材料', 200, 180, 'active'),
('MAT009', '电焊条', 'J422 Φ3.2', '包', '辅助材料', 50, 45, 'active'),
('MAT010', '轴承', '6205', '个', '零配件', 30, 25, 'active')
ON DUPLICATE KEY UPDATE material_name = VALUES(material_name);

SELECT '库存管理模块数据库迁移完成!' as message;
