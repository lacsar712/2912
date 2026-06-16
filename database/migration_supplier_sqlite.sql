-- ============================================
-- 供应商管理模块数据库迁移脚本 (SQLite版本)
-- ============================================

-- 供应商档案表
CREATE TABLE IF NOT EXISTS supplier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    address VARCHAR(500),
    cooperation_start_date DATE,
    cooperation_status VARCHAR(20) DEFAULT 'active',
    status SMALLINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (cooperation_status IN ('active', 'suspended', 'blacklisted'))
);

-- 合同表
CREATE TABLE IF NOT EXISTS contract (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_id BIGINT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contract_amount DECIMAL(15,2),
    attachment TEXT,
    contract_status VARCHAR(20) DEFAULT 'active',
    status SMALLINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES supplier(id),
    CHECK (contract_status IN ('active', 'expired', 'terminated'))
);

-- 月度评分表
CREATE TABLE IF NOT EXISTS monthly_rating (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id BIGINT,
    rating_date DATE NOT NULL,
    quality_score INT NOT NULL,
    delivery_score INT NOT NULL,
    price_score INT NOT NULL,
    service_score INT NOT NULL,
    total_score DECIMAL(5,2),
    remark TEXT,
    status SMALLINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES supplier(id),
    CHECK (quality_score BETWEEN 1 AND 10),
    CHECK (delivery_score BETWEEN 1 AND 10),
    CHECK (price_score BETWEEN 1 AND 10),
    CHECK (service_score BETWEEN 1 AND 10)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_supplier_name ON supplier(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_status ON supplier(status);
CREATE INDEX IF NOT EXISTS idx_contract_supplier ON contract(supplier_id);
CREATE INDEX IF NOT EXISTS idx_contract_end_date ON contract(end_date);
CREATE INDEX IF NOT EXISTS idx_contract_status ON contract(contract_status);
CREATE INDEX IF NOT EXISTS idx_rating_supplier ON monthly_rating(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rating_date ON monthly_rating(rating_date);

-- 插入示例供应商数据
INSERT OR IGNORE INTO supplier (supplier_code, supplier_name, contact_person, contact_phone, contact_email, address, cooperation_start_date, cooperation_status) VALUES
('SUP001', '上海机械设备有限公司', '张三', '13800138001', 'zhangsan@shjx.com', '上海市浦东新区张江高科技园区', '2023-01-15', 'active'),
('SUP002', '苏州电子科技有限公司', '李四', '13800138002', 'lisi@suzhouelec.com', '苏州市工业园区金鸡湖大道88号', '2023-03-20', 'active'),
('SUP003', '杭州五金制品厂', '王五', '13800138003', 'wangwu@hangzhouwj.com', '杭州市萧山区经济技术开发区', '2023-05-10', 'active'),
('SUP004', '南京化工材料有限公司', '赵六', '13800138004', 'zhaoliu@nanjinghg.com', '南京市江北新区化工园', '2023-06-01', 'suspended'),
('SUP005', '合肥包装材料厂', '钱七', '13800138005', 'qianqi@hefeibz.com', '合肥市经济技术开发区', '2023-08-15', 'active');

-- 插入示例合同数据
INSERT OR IGNORE INTO contract (contract_code, supplier_id, start_date, end_date, contract_amount, contract_status) VALUES
('CT2024001', 1, '2024-01-01', '2024-12-31', 500000.00, 'active'),
('CT2024002', 2, '2024-02-01', '2024-07-31', 300000.00, 'active'),
('CT2024003', 3, '2024-03-01', '2024-08-30', 150000.00, 'active'),
('CT2024004', 5, '2024-01-15', '2024-07-15', 80000.00, 'active'),
('CT2024005', 1, '2023-06-01', DATE('now', '+10 days'), 800000.00, 'active');

-- 插入示例评分数据
INSERT OR IGNORE INTO monthly_rating (supplier_id, rating_date, quality_score, delivery_score, price_score, service_score, total_score, remark) VALUES
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
(5, '2024-05-01', 10, 9, 9, 9, 9.25, '保持优秀');

SELECT '供应商管理模块数据库迁移完成 (SQLite)!' as message;
