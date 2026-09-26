const STORAGE_KEY = 'invoice_app_data';
const THEME_KEY = 'invoice_app_theme';

let appData = {
    clients: [],
    products: [],
    quotations: [],
    invoices: [],
    invoiceCounters: {}
};

let editingClientId = null;
let editingProductId = null;
let editingQuotationId = null;
let currentInvoiceForPreview = null;
let currentInvoiceForStatus = null;

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle');
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeButton(newTheme);
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (error) {
        console.error('Failed to save data:', error);
        alert('Storage error. Some data may not be saved.');
    }
}

function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            appData = JSON.parse(stored);
        } else {
            appData = {
                clients: [],
                products: [],
                quotations: [],
                invoices: [],
                invoiceCounters: {}
            };
        }
    } catch (error) {
        console.error('Failed to load data:', error);
        appData = {
            clients: [],
            products: [],
            quotations: [],
            invoices: [],
            invoiceCounters: {}
        };
    }
}

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

function getNextInvoiceNumber() {
    const year = new Date().getFullYear();
    if (!appData.invoiceCounters[year]) {
        appData.invoiceCounters[year] = 1;
    } else {
        appData.invoiceCounters[year]++;
    }
    return `INV-${year}-${String(appData.invoiceCounters[year]).padStart(3, '0')}`;
}

/* CLIENTS */
function showClientModal(clientId = null) {
    editingClientId = clientId;
    const form = document.getElementById('client-form');
    const title = document.getElementById('client-modal-title');

    form.reset();

    if (clientId) {
        const client = appData.clients.find(c => c.id === clientId);
        if (client) {
            title.textContent = 'Edit Client';
            document.getElementById('client-name').value = client.name;
            document.getElementById('client-email').value = client.email;
            document.getElementById('client-address').value = client.address;
            document.getElementById('client-phone').value = client.phone;
            document.getElementById('client-taxid').value = client.taxId;
        }
    } else {
        title.textContent = 'Add Client';
    }

    document.getElementById('client-modal').classList.remove('hidden');
}

function hideClientModal() {
    document.getElementById('client-modal').classList.add('hidden');
    editingClientId = null;
}

function saveClient(e) {
    e.preventDefault();
    const name = document.getElementById('client-name').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const address = document.getElementById('client-address').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const taxId = document.getElementById('client-taxid').value.trim();

    if (!name) return;

    if (editingClientId) {
        const client = appData.clients.find(c => c.id === editingClientId);
        if (client) {
            client.name = name;
            client.email = email;
            client.address = address;
            client.phone = phone;
            client.taxId = taxId;
        }
    } else {
        appData.clients.push({
            id: generateId(),
            name, email, address, phone, taxId
        });
    }

    saveData();
    hideClientModal();
    renderClients();
}

function deleteClient(id) {
    if (confirm('Delete this client?')) {
        appData.clients = appData.clients.filter(c => c.id !== id);
        saveData();
        renderClients();
    }
}

function renderClients() {
    const clientsList = document.getElementById('clients-list');
    if (appData.clients.length === 0) {
        clientsList.innerHTML = '<div class="empty-state">No clients yet. Add one to get started!</div>';
        return;
    }

    clientsList.innerHTML = appData.clients.map(client => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-title">${escapeHtml(client.name)}</div>
                <div class="list-item-subtitle">${escapeHtml(client.email)} • ${escapeHtml(client.phone)}</div>
                <div class="list-item-subtitle">${escapeHtml(client.address)}</div>
            </div>
            <div class="list-item-actions">
                <button class="secondary-btn" onclick="showClientModal('${client.id}')">Edit</button>
                <button class="danger-btn" onclick="deleteClient('${client.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

/* PRODUCTS */
function showProductModal(productId = null) {
    editingProductId = productId;
    const form = document.getElementById('product-form');
    const title = document.getElementById('product-modal-title');

    form.reset();

    if (productId) {
        const product = appData.products.find(p => p.id === productId);
        if (product) {
            title.textContent = 'Edit Product';
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-description').value = product.description;
        }
    } else {
        title.textContent = 'Add Product';
    }

    document.getElementById('product-modal').classList.remove('hidden');
}

function hideProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    editingProductId = null;
}

function saveProduct(e) {
    e.preventDefault();
    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const description = document.getElementById('product-description').value.trim();

    if (!name || isNaN(price) || price < 0) return;

    if (editingProductId) {
        const product = appData.products.find(p => p.id === editingProductId);
        if (product) {
            product.name = name;
            product.price = price;
            product.description = description;
        }
    } else {
        appData.products.push({
            id: generateId(),
            name, price, description
        });
    }

    saveData();
    hideProductModal();
    renderProducts();
    updateLineItemSelects();
}

function deleteProduct(id) {
    if (confirm('Delete this product?')) {
        appData.products = appData.products.filter(p => p.id !== id);
        saveData();
        renderProducts();
    }
}

function renderProducts() {
    const productsList = document.getElementById('products-list');
    if (appData.products.length === 0) {
        productsList.innerHTML = '<div class="empty-state">No products yet. Add one to get started!</div>';
        return;
    }

    productsList.innerHTML = appData.products.map(product => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-title">${escapeHtml(product.name)}</div>
                <div class="list-item-subtitle">$${product.price.toFixed(2)} • ${escapeHtml(product.description)}</div>
            </div>
            <div class="list-item-actions">
                <button class="secondary-btn" onclick="showProductModal('${product.id}')">Edit</button>
                <button class="danger-btn" onclick="deleteProduct('${product.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

/* QUOTATIONS */
function showQuotationModal(quotationId = null) {
    editingQuotationId = quotationId;
    const form = document.getElementById('quotation-form');
    const title = document.getElementById('quotation-modal-title');
    const clientSelect = document.getElementById('quotation-client');

    form.reset();
    document.getElementById('line-items-container').innerHTML = '';

    clientSelect.innerHTML = '<option value="">-- Select a client --</option>' +
        appData.clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    if (quotationId) {
        const quotation = appData.quotations.find(q => q.id === quotationId);
        if (quotation) {
            title.textContent = 'Edit Quotation';
            document.getElementById('quotation-client').value = quotation.clientId;
            document.getElementById('quotation-tax-rate').value = quotation.taxRate;

            quotation.lineItems.forEach(item => {
                addLineItemToForm(item.productId, item.qty, item.price);
            });
        }
    } else {
        title.textContent = 'New Quotation';
        addLineItemToForm();
    }

    document.getElementById('quotation-modal').classList.remove('hidden');
}

function hideQuotationModal() {
    document.getElementById('quotation-modal').classList.add('hidden');
    editingQuotationId = null;
}

function addLineItemToForm(productId = '', qty = 1, price = '') {
    const container = document.getElementById('line-items-container');
    const template = container.querySelector('.line-item-template');
    const lineItem = template.cloneNode(true);
    lineItem.classList.remove('hidden', 'line-item-template');

    const productSelect = lineItem.querySelector('.line-product');
    productSelect.innerHTML = '<option value="">-- Select product --</option>' +
        appData.products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    productSelect.value = productId;
    productSelect.addEventListener('change', (e) => {
        const product = appData.products.find(p => p.id === e.target.value);
        if (product) {
            lineItem.querySelector('.line-price').value = product.price.toFixed(2);
            updateQuotationTotals();
        }
    });

    const qtyInput = lineItem.querySelector('.line-qty');
    qtyInput.value = qty;
    qtyInput.addEventListener('change', updateQuotationTotals);

    const priceInput = lineItem.querySelector('.line-price');
    priceInput.value = price;
    priceInput.addEventListener('change', updateQuotationTotals);

    const removeBtn = lineItem.querySelector('.remove-line-btn');
    removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        lineItem.remove();
        updateQuotationTotals();
    });

    container.appendChild(lineItem);
    updateQuotationTotals();
}

function updateQuotationTotals() {
    const lineItems = document.querySelectorAll('.line-item:not(.line-item-template)');
    let subtotal = 0;

    lineItems.forEach(item => {
        const qty = parseFloat(item.querySelector('.line-qty').value) || 0;
        const price = parseFloat(item.querySelector('.line-price').value) || 0;
        const lineSubtotal = qty * price;
        item.querySelector('.line-subtotal').textContent = lineSubtotal.toFixed(2);
        subtotal += lineSubtotal;
    });

    const taxRate = parseFloat(document.getElementById('quotation-tax-rate').value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    document.getElementById('quotation-subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('quotation-tax').textContent = tax.toFixed(2);
    document.getElementById('quotation-total').textContent = total.toFixed(2);
}

function saveQuotation(e) {
    e.preventDefault();
    const clientId = document.getElementById('quotation-client').value;
    const taxRate = parseFloat(document.getElementById('quotation-tax-rate').value);

    if (!clientId || isNaN(taxRate)) return;

    const lineItems = [];
    document.querySelectorAll('.line-item:not(.line-item-template)').forEach(item => {
        const productId = item.querySelector('.line-product').value;
        const qty = parseFloat(item.querySelector('.line-qty').value);
        const price = parseFloat(item.querySelector('.line-price').value);
        if (productId && qty > 0 && price >= 0) {
            lineItems.push({ productId, qty, price });
        }
    });

    if (lineItems.length === 0) {
        alert('Add at least one line item');
        return;
    }

    const subtotal = lineItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    if (editingQuotationId) {
        const quotation = appData.quotations.find(q => q.id === editingQuotationId);
        if (quotation) {
            quotation.clientId = clientId;
            quotation.lineItems = lineItems;
            quotation.subtotal = subtotal;
            quotation.taxRate = taxRate;
            quotation.tax = tax;
            quotation.total = total;
        }
    } else {
        appData.quotations.push({
            id: generateId(),
            clientId, lineItems, subtotal, tax, taxRate, total,
            createdDate: new Date().toISOString().split('T')[0],
            status: 'Draft'
        });
    }

    saveData();
    hideQuotationModal();
    renderQuotations();
}

function deleteQuotation(id) {
    if (confirm('Delete this quotation?')) {
        appData.quotations = appData.quotations.filter(q => q.id !== id);
        saveData();
        renderQuotations();
    }
}

function convertToInvoice(quotationId) {
    const quotation = appData.quotations.find(q => q.id === quotationId);
    if (!quotation) return;

    const invoiceNumber = getNextInvoiceNumber();
    const invoice = {
        id: generateId(),
        quotationId: quotationId,
        invoiceNumber: invoiceNumber,
        clientId: quotation.clientId,
        lineItems: quotation.lineItems,
        subtotal: quotation.subtotal,
        tax: quotation.tax,
        taxRate: quotation.taxRate,
        total: quotation.total,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Draft',
        paidDate: null
    };

    quotation.status = 'Sent';
    appData.invoices.push(invoice);
    saveData();
    renderQuotations();
    renderInvoices();
    switchTab('invoices');
}

function renderQuotations() {
    const quotationsList = document.getElementById('quotations-list');
    if (appData.quotations.length === 0) {
        quotationsList.innerHTML = '<div class="empty-state">No quotations yet. Create one to get started!</div>';
        return;
    }

    quotationsList.innerHTML = appData.quotations.map(quotation => {
        const client = appData.clients.find(c => c.id === quotation.clientId);
        return `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-title">Quotation • ${escapeHtml(client ? client.name : 'Unknown')}</div>
                    <div class="list-item-subtitle">Created: ${quotation.createdDate}</div>
                    <div class="list-item-subtitle">Total: $${quotation.total.toFixed(2)}</div>
                </div>
                <div class="list-item-actions">
                    <button class="secondary-btn" onclick="showQuotationModal('${quotation.id}')">Edit</button>
                    <button class="primary-btn" onclick="convertToInvoice('${quotation.id}')">Convert to Invoice</button>
                    <button class="danger-btn" onclick="deleteQuotation('${quotation.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

/* INVOICES */
function showInvoicePreview(invoiceId) {
    const invoice = appData.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    currentInvoiceForPreview = invoiceId;
    const client = appData.clients.find(c => c.id === invoice.clientId);

    let html = `
        <div class="invoice-header">
            <div class="invoice-title">INVOICE</div>
            <div>Invoice #: <strong>${escapeHtml(invoice.invoiceNumber)}</strong></div>
            <div>Date: <strong>${invoice.invoiceDate}</strong></div>
            <div>Due: <strong>${invoice.dueDate}</strong></div>
        </div>

        <div class="invoice-info">
            <div class="invoice-info-section">
                <h4>Bill To:</h4>
                <div>${escapeHtml(client ? client.name : 'Unknown')}</div>
                <div>${escapeHtml(client ? client.email : '')}</div>
                <div>${escapeHtml(client ? client.address : '')}</div>
                <div>${escapeHtml(client ? client.phone : '')}</div>
                ${client && client.taxId ? `<div>Tax ID: ${escapeHtml(client.taxId)}</div>` : ''}
            </div>
            <div class="invoice-info-section">
                <h4>Status:</h4>
                <div class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</div>
            </div>
        </div>

        <table class="invoice-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.lineItems.map(item => {
                    const product = appData.products.find(p => p.id === item.productId);
                    const amount = item.qty * item.price;
                    return `
                        <tr>
                            <td>${escapeHtml(product ? product.name : 'Product')}</td>
                            <td class="text-right">${item.qty}</td>
                            <td class="text-right">$${item.price.toFixed(2)}</td>
                            <td class="text-right">$${amount.toFixed(2)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="invoice-totals">
            <div class="invoice-total-row">
                <span>Subtotal:</span>
                <span>$${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div class="invoice-total-row">
                <span>Tax (${invoice.taxRate}%):</span>
                <span>$${invoice.tax.toFixed(2)}</span>
            </div>
            <div class="invoice-total-row grand-total">
                <span>Total:</span>
                <span>$${invoice.total.toFixed(2)}</span>
            </div>
        </div>
    `;

    document.getElementById('invoice-preview-content').innerHTML = html;
    document.getElementById('invoice-preview-modal').classList.remove('hidden');
}

function hideInvoicePreview() {
    document.getElementById('invoice-preview-modal').classList.add('hidden');
    currentInvoiceForPreview = null;
}

function downloadInvoicePDF() {
    if (!currentInvoiceForPreview) return;

    const invoice = appData.invoices.find(i => i.id === currentInvoiceForPreview);
    const element = document.getElementById('invoice-preview-content');
    const opt = {
        margin: 10,
        filename: `${invoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    html2pdf().set(opt).from(element).save();
}

function showInvoiceStatusModal(invoiceId) {
    currentInvoiceForStatus = invoiceId;
    const invoice = appData.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const statusSelect = document.getElementById('invoice-status-select');
    const paidDateGroup = document.getElementById('paid-date-group');
    const paidDateInput = document.getElementById('invoice-paid-date');

    statusSelect.value = invoice.status;
    paidDateInput.value = invoice.paidDate || '';

    if (invoice.status === 'Paid') {
        paidDateGroup.style.display = 'block';
    } else {
        paidDateGroup.style.display = 'none';
    }

    document.getElementById('invoice-status-modal').classList.remove('hidden');
}

function hideInvoiceStatusModal() {
    document.getElementById('invoice-status-modal').classList.add('hidden');
    currentInvoiceForStatus = null;
}

function updateInvoiceStatus(e) {
    e.preventDefault();
    if (!currentInvoiceForStatus) return;

    const invoice = appData.invoices.find(i => i.id === currentInvoiceForStatus);
    if (!invoice) return;

    const status = document.getElementById('invoice-status-select').value;
    const paidDate = document.getElementById('invoice-paid-date').value;

    invoice.status = status;
    invoice.paidDate = status === 'Paid' ? paidDate : null;

    saveData();
    hideInvoiceStatusModal();
    renderInvoices();
}

function deleteInvoice(id) {
    if (confirm('Delete this invoice?')) {
        appData.invoices = appData.invoices.filter(i => i.id !== id);
        saveData();
        renderInvoices();
    }
}

function renderInvoices() {
    const invoicesList = document.getElementById('invoices-list');
    if (appData.invoices.length === 0) {
        invoicesList.innerHTML = '<div class="empty-state">No invoices yet. Convert a quotation to create one!</div>';
        return;
    }

    invoicesList.innerHTML = appData.invoices.map(invoice => {
        const client = appData.clients.find(c => c.id === invoice.clientId);
        const isOverdue = invoice.status !== 'Paid' && new Date(invoice.dueDate) < new Date();
        const statusClass = isOverdue && invoice.status !== 'Overdue' ? 'status-overdue' : `status-${invoice.status.toLowerCase()}`;

        return `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-title">${escapeHtml(invoice.invoiceNumber)} • ${escapeHtml(client ? client.name : 'Unknown')}</div>
                    <div class="list-item-subtitle">Date: ${invoice.invoiceDate} | Due: ${invoice.dueDate}</div>
                    <div class="list-item-subtitle">Total: $${invoice.total.toFixed(2)}</div>
                    <span class="status-badge ${statusClass}">${isOverdue && invoice.status !== 'Overdue' ? 'Overdue' : invoice.status}</span>
                </div>
                <div class="list-item-actions">
                    <button class="secondary-btn" onclick="showInvoicePreview('${invoice.id}')">View</button>
                    <button class="primary-btn" onclick="showInvoiceStatusModal('${invoice.id}')">Status</button>
                    <button class="danger-btn" onclick="deleteInvoice('${invoice.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

/* AGEING REPORT */
function renderAgeingReport() {
    const ageingReport = document.getElementById('ageing-report');
    const unpaidInvoices = appData.invoices.filter(i => i.status !== 'Paid');

    if (unpaidInvoices.length === 0) {
        ageingReport.innerHTML = '<div class="empty-state">No unpaid invoices.</div>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = {
        'Current (0-30 days)': [],
        'Overdue (31-60 days)': [],
        'Overdue (61-90 days)': [],
        'Overdue (90+ days)': []
    };

    unpaidInvoices.forEach(invoice => {
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) {
            buckets['Current (0-30 days)'].push(invoice);
        } else if (daysOverdue <= 60) {
            buckets['Overdue (31-60 days)'].push(invoice);
        } else if (daysOverdue <= 90) {
            buckets['Overdue (61-90 days)'].push(invoice);
        } else {
            buckets['Overdue (90+ days)'].push(invoice);
        }
    });

    let html = '';
    let grandTotal = 0;

    Object.entries(buckets).forEach(([bucket, invoices]) => {
        if (invoices.length === 0) return;

        const bucketTotal = invoices.reduce((sum, inv) => sum + inv.total, 0);
        grandTotal += bucketTotal;

        html += `
            <div class="ageing-section">
                <div class="ageing-section-header">${bucket}</div>
                <div class="ageing-items">
                    ${invoices.map(invoice => {
                        const client = appData.clients.find(c => c.id === invoice.clientId);
                        return `
                            <div class="ageing-item">
                                <div class="ageing-item-info">
                                    <div class="ageing-item-name">${escapeHtml(invoice.invoiceNumber)}</div>
                                    <div class="ageing-item-amount">${escapeHtml(client ? client.name : 'Unknown')} • Due: ${invoice.dueDate}</div>
                                </div>
                                <div class="ageing-item-amount-value">$${invoice.total.toFixed(2)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="ageing-total">
                    <span class="ageing-total-label">${bucket} Total:</span>
                    <span class="ageing-total-value">$${bucketTotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    });

    if (html) {
        html += `
            <div class="ageing-section">
                <div class="ageing-total">
                    <span class="ageing-total-label">GRAND TOTAL (All Unpaid):</span>
                    <span class="ageing-total-value">$${grandTotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    ageingReport.innerHTML = html;
}

/* UI UTILITIES */
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(tabName + '-tab').classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

function updateLineItemSelects() {
    document.querySelectorAll('.line-product').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select product --</option>' +
            appData.products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        select.value = currentValue;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* EVENT LISTENERS */
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
});

document.getElementById('add-client-btn').addEventListener('click', () => showClientModal());
document.getElementById('client-form').addEventListener('submit', saveClient);
document.querySelectorAll('#client-modal .close-modal, #client-modal .close-btn').forEach(el => {
    el.addEventListener('click', hideClientModal);
});

document.getElementById('add-product-btn').addEventListener('click', () => showProductModal());
document.getElementById('product-form').addEventListener('submit', saveProduct);
document.querySelectorAll('#product-modal .close-modal, #product-modal .close-btn').forEach(el => {
    el.addEventListener('click', hideProductModal);
});

document.getElementById('new-quotation-btn').addEventListener('click', () => showQuotationModal());
document.getElementById('quotation-form').addEventListener('submit', saveQuotation);
document.getElementById('add-line-item-btn').addEventListener('click', (e) => {
    e.preventDefault();
    addLineItemToForm();
});
document.querySelectorAll('#quotation-modal .close-modal, #quotation-modal .close-btn').forEach(el => {
    el.addEventListener('click', hideQuotationModal);
});

document.getElementById('download-invoice-btn').addEventListener('click', downloadInvoicePDF);
document.querySelectorAll('#invoice-preview-modal .close-modal, #invoice-preview-modal .close-btn').forEach(el => {
    el.addEventListener('click', hideInvoicePreview);
});

document.getElementById('invoice-status-form').addEventListener('submit', updateInvoiceStatus);
document.getElementById('invoice-status-select').addEventListener('change', (e) => {
    const paidDateGroup = document.getElementById('paid-date-group');
    paidDateGroup.style.display = e.target.value === 'Paid' ? 'block' : 'none';
});
document.querySelectorAll('#invoice-status-modal .close-modal, #invoice-status-modal .close-btn').forEach(el => {
    el.addEventListener('click', hideInvoiceStatusModal);
});

document.querySelectorAll('.modal .close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.add('hidden');
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});

loadTheme();
loadData();
renderClients();
renderProducts();
renderQuotations();
renderInvoices();
renderAgeingReport();
