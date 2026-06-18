/**
 * 客户订单管理服务
 */
const CustomerOrderService = {
    // 客户档案
    async getCustomers(params = {}) {
        return await Request.get('/customer-order/customers', params);
    },

    async getCustomerById(id) {
        return await Request.get(`/customer-order/customers/${id}`);
    },

    async createCustomer(data) {
        return await Request.post('/customer-order/customers', data);
    },

    async updateCustomer(id, data) {
        return await Request.put(`/customer-order/customers/${id}`, data);
    },

    async deleteCustomer(id) {
        return await Request.delete(`/customer-order/customers/${id}`);
    },

    // 订单
    async getOrders(params = {}) {
        return await Request.get('/customer-order/orders', params);
    },

    async getOrderById(id) {
        return await Request.get(`/customer-order/orders/${id}`);
    },

    async createOrder(data) {
        return await Request.post('/customer-order/orders', data);
    },

    async updateOrder(id, data) {
        return await Request.put(`/customer-order/orders/${id}`, data);
    },

    async deleteOrder(id) {
        return await Request.delete(`/customer-order/orders/${id}`);
    },

    async approveOrder(id) {
        return await Request.put(`/customer-order/orders/${id}/approve`);
    },

    async cancelOrder(id) {
        return await Request.put(`/customer-order/orders/${id}/cancel`);
    },

    async splitOrder(id, data) {
        return await Request.post(`/customer-order/orders/${id}/split`, data);
    },

    async getOrderCompletion(id) {
        return await Request.get(`/customer-order/orders/${id}/completion`);
    },

    // 发货单
    async getDeliveries(params = {}) {
        return await Request.get('/customer-order/deliveries', params);
    },

    async createDelivery(data) {
        return await Request.post('/customer-order/deliveries', data);
    },

    async updateDelivery(id, data) {
        return await Request.put(`/customer-order/deliveries/${id}`, data);
    },

    async deleteDelivery(id) {
        return await Request.delete(`/customer-order/deliveries/${id}`);
    },

    // 看板/统计
    async getDelayRiskOrders(params = {}) {
        return await Request.get('/customer-order/dashboard/delay-risks', params);
    },

    async getOrderStats() {
        return await Request.get('/customer-order/dashboard/stats');
    }
};

window.CustomerOrderService = CustomerOrderService;
