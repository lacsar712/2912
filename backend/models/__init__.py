"""
模型模块
"""
from .base import BaseModel
from .user import User
from .data import Data
from .category import Category
from .log import Log
from .config import Config as SystemConfig
from .production import (
    ProductionLine,
    Equipment,
    Sensor,
    ProductionTask,
    ProductionRecord,
    AlertRecord
)
from .inventory import (
    Material,
    StockIn,
    StockOut,
    StockFlow
)
from .supplier import (
    Supplier,
    Contract,
    MonthlyRating
)
from .quality import (
    InspectionTemplate,
    InspectionTemplateItem,
    InspectionOrder,
    InspectionResult,
    DefectRecord
)

__all__ = [
    'BaseModel',
    'User',
    'Data',
    'Category',
    'Log',
    'SystemConfig',
    'ProductionLine',
    'Equipment',
    'Sensor',
    'ProductionTask',
    'ProductionRecord',
    'AlertRecord',
    'Material',
    'StockIn',
    'StockOut',
    'StockFlow',
    'Supplier',
    'Contract',
    'MonthlyRating',
    'InspectionTemplate',
    'InspectionTemplateItem',
    'InspectionOrder',
    'InspectionResult',
    'DefectRecord'
]
