-- ============================================
-- 供应商管理模块数据库迁移脚本
-- ============================================

-- 供应商档案表
CREATE TABLE IF NOT EXISTS supplier (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    supplier_code VARCHAR(50) NOT NULL COMMENT '供应商编号',
    supplier_name VARCHAR(200) NOT NULL COMMENT '供应商名称',
    contact_person VARCHAR(50) COMMENT '联系人',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    contact_email VARCHAR(100) COMMENT '联系邮箱',
    address VARCHAR(500) COMMENT '地址',
    cooperation_start_date DATE COMMENT '合作开始日期',
    cooperation_status ENUM('active', 'suspended', 'blacklisted') DEFAULT 'active' COMMENT '合作状态: active合作中/suspended暂停/blacklisted拉黑',
    status TINYINT DEFAULT 1 COMMENT '状态: 0删除/1正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_supplier_code (supplier_code),
    INDEX idx_supplier_name (supplier_name),
    INDEX idx_cooperation_status (cooperation_status),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商档案表';

-- 合同表
CREATE TABLE IF NOT EXISTS contract (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    contract_code VARCHAR(50) NOT NULL COMMENT '合同编号',
    supplier_id BIGINT COMMENT '关联供应商ID',
    start_date DATE NOT NULL COMMENT '合同开始日期',
    end_date DATE NOT NULL COMMENT '合同结束日期',
    contract_amount DECIMAL(15,2) COMMENT '合同金额',
    attachment TEXT COMMENT '合同附件 base64',
    contract_status ENUM('active', 'expired', 'terminated') DEFAULT 'active' COMMENT '合同状态: active生效中/expired已到期/terminated已终止',
    status TINYINT DEFAULT 1 COMMENT '状态: 0删除/1正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_contract_code (contract_code),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_end_date (end_date),
    INDEX idx_contract_status (contract_status),
    INDEX idx_status (status),
    CONSTRAINT fk_contract_supplier FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同表';

-- 月度评分表
CREATE TABLE IF NOT EXISTS monthly_rating (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    supplier_id BIGINT COMMENT '供应商ID',
    rating_date DATE NOT NULL COMMENT '评分月份',
    quality_score INT NOT NULL COMMENT '质量评分 1-10',
    delivery_score INT NOT NULL COMMENT '交付评分 1-10',
    price_score INT NOT NULL COMMENT '价格评分 1-10',
    service_score INT NOT NULL COMMENT '服务评分 1-10',
    total_score DECIMAL(5,2) COMMENT '综合分 (自动计算)',
    remark TEXT COMMENT '备注',
    status TINYINT DEFAULT 1 COMMENT '状态: 0删除/1正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_rating_date (rating_date),
    INDEX idx_status (status),
    CONSTRAINT fk_rating_supplier FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='月度评分表';

-- 插入示例供应商数据
INSERT INTO supplier (supplier_code, supplier_name, contact_person, contact_phone, contact_email, address, cooperation_start_date, cooperation_status) VALUES
('SUP001', '上海机械设备有限公司', '张三', '13800138001', 'zhangsan@shjx.com', '上海市浦东新区张江高科技园区', '2023-01-15', 'active'),
('SUP002', '苏州电子科技有限公司', '李四', '13800138002', 'lisi@suzhouelec.com', '苏州市工业园区金鸡湖大道88号', '2023-03-20', 'active'),
('SUP003', '杭州五金制品厂', '王五', '13800138003', 'wangwu@hangzhouwj.com', '杭州市萧山区经济技术开发区', '2023-05-10', 'active'),
('SUP004', '南京化工材料有限公司', '赵六', '13800138004', 'zhaoliu@nanjinghg.com', '南京市江北新区化工园', '2023-06-01', 'suspended'),
('SUP005', '合肥包装材料厂', '钱七', '13800138005', 'qianqi@hefeibz.com', '合肥市经济技术开发区', '2023-08-15', 'active')
ON DUPLICATE KEY UPDATE supplier_name = VALUES(supplier_name);

-- 插入示例合同数据
INSERT INTO contract (contract_code, supplier_id, start_date, end_date, contract_amount, contract_status) VALUES
('CT2024001', 1, '2024-01-01', '2024-12-31', 500000.00, 'active'),
('CT2024002', 2, '2024-02-01', '2024-07-31', 300000.00, 'active'),
('CT2024003', 3, '2024-03-01', '2024-08-30', 150000.00, 'active'),
('CT2024004', 5, '2024-01-15', '2024-07-15', 80000.00, 'active'),
('CT2024005', 1, '2023-06-01', '2024-05-31', 800000.00, 'active')
ON DUPLICATE KEY UPDATE contract_code = contract_code;

-- 插入示例评分数据
INSERT INTO monthly_rating (supplier_id, rating_date, quality_score, delivery_score, price_score, service_score, total_score, remark) VALUES
(1, '2024-03-01', 9, 8, 7, 9, 8.25, '产品质量稳定，交付及时'),
(1, '2024-04-01', 8, 9, 7, 8, 8.00, '本月交付略有延迟'),
(1, '2024-05-01', 9, 9, 8, 9, 8.75, '表现优秀'),
(2, '2024-03-01', 7, 6, 8, 7, 7.00, '质量一般，需要改进'),
(2, '2024-04-01', 8, 7, 8, 8, 7.75, '有所提升'),
(2, '2024-05-01', 8, 8, 9, 8, 8.25, '进步明显'),
(3, '2024-03-01', 6, 5, 9, 7, 6.75, '交付延迟较严重'),
(3, '2024-04-01', 7, 6, 9, 7, 7.25, '交付情况改善'),
(3, '2024-05-01', 7, 7, 9, 8, 7.75, '持续改善中'),
(5, '2024-03-01', 10, 9, 8, 9, 9.00, '质量非常好，服务周到'),
(5, '2024-04-01', 9, 10, 8, 10, 9.25, '表现卓越'),
(5, '2024-05-01', 10, 9, 9, 9, 9.25, '保持优秀')
ON DUPLICATE KEY UPDATE total_score = VALUES(total_score);

SELECT '供应商管理模块数据库迁移完成!' as message;
