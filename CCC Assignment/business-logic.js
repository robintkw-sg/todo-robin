/**
 * Business logic for Invoice & Quotation Generator
 * Separated from UI for testability
 */

/**
 * Calculate quotation totals
 * @param {number} subtotal - Sum of line items
 * @param {number} taxRate - Tax rate as percentage (e.g., 10 for 10%)
 * @returns {object} { subtotal, tax, taxRate, total }
 */
function calculateQuotationTotals(subtotal, taxRate) {
    if (subtotal < 0 || taxRate < 0 || taxRate > 100) {
        throw new Error('Invalid input: subtotal and taxRate must be non-negative');
    }
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        taxRate,
        total: Math.round(total * 100) / 100
    };
}

/**
 * Calculate line item subtotal
 * @param {number} quantity - Quantity
 * @param {number} price - Unit price
 * @returns {number} Subtotal (quantity × price)
 */
function calculateLineItemSubtotal(quantity, price) {
    if (quantity < 0 || price < 0) {
        throw new Error('Invalid input: quantity and price must be non-negative');
    }
    return Math.round(quantity * price * 100) / 100;
}

/**
 * Calculate line items subtotal
 * @param {array} lineItems - Array of {qty, price}
 * @returns {number} Total subtotal
 */
function calculateLineItemsSubtotal(lineItems) {
    return Math.round(
        lineItems.reduce((sum, item) => sum + (item.qty * item.price), 0) * 100
    ) / 100;
}

/**
 * Generate next invoice number for a given year
 * @param {object} invoiceCounters - { '2026': 5, '2025': 45 }
 * @param {number} year - Calendar year (default: current year)
 * @returns {object} { invoiceNumber, nextCounter }
 */
function getNextInvoiceNumber(invoiceCounters, year = null) {
    if (!year) {
        year = new Date().getFullYear();
    }

    const currentCounter = invoiceCounters[year] || 0;
    const nextCounter = currentCounter + 1;
    const invoiceNumber = `INV-${year}-${String(nextCounter).padStart(3, '0')}`;

    return {
        invoiceNumber,
        nextCounter,
        year
    };
}

/**
 * Update invoice counters after generating an invoice number
 * @param {object} invoiceCounters - Current counters
 * @param {number} year - Year for which to increment
 * @returns {object} Updated counters
 */
function updateInvoiceCounters(invoiceCounters, year) {
    const updated = { ...invoiceCounters };
    updated[year] = (updated[year] || 0) + 1;
    return updated;
}

/**
 * Calculate days until due date (negative if overdue, 0 if due today)
 * @param {string} dueDate - ISO date string (e.g., "2026-09-26")
 * @param {string} fromDate - ISO date string to calculate from (default: today)
 * @returns {number} Days until due (negative if overdue)
 */
function calculateDaysUntilDue(dueDate, fromDate = null) {
    const today = fromDate ? new Date(fromDate) : new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diff = due - today;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Determine urgency class for a due date
 * @param {string} dueDate - ISO date string
 * @param {string} fromDate - ISO date string to calculate from (default: today)
 * @returns {string} 'overdue' | 'due-today' | 'due-soon' | 'due-later'
 */
function getUrgencyClass(dueDate, fromDate = null) {
    const daysLeft = calculateDaysUntilDue(dueDate, fromDate);
    if (daysLeft < 0) return 'overdue';
    if (daysLeft === 0) return 'due-today';
    if (daysLeft <= 3) return 'due-soon';
    return 'due-later';
}

/**
 * Get ageing bucket for an unpaid invoice
 * @param {string} dueDate - Invoice due date (ISO string)
 * @param {string} fromDate - Date to calculate from (default: today)
 * @returns {string} 'current' | 'overdue-31-60' | 'overdue-61-90' | 'overdue-90+'
 */
function getAgeingBucket(dueDate, fromDate = null) {
    const daysOverdue = calculateDaysUntilDue(dueDate, fromDate);

    if (daysOverdue >= -30) return 'current';
    if (daysOverdue >= -60) return 'overdue-31-60';
    if (daysOverdue >= -90) return 'overdue-61-90';
    return 'overdue-90+';
}

/**
 * Group invoices by ageing bucket
 * @param {array} invoices - Array of invoice objects with dueDate and total
 * @param {array} statuses - Only include invoices with these statuses (default: ['Draft', 'Sent', 'Overdue'])
 * @param {string} fromDate - Date to calculate from (default: today)
 * @returns {object} { 'current': [...], 'overdue-31-60': [...], ... }
 */
function groupInvoicesByAgeing(invoices, statuses = ['Draft', 'Sent', 'Overdue'], fromDate = null) {
    const buckets = {
        'current': [],
        'overdue-31-60': [],
        'overdue-61-90': [],
        'overdue-90+': []
    };

    invoices.forEach(invoice => {
        if (statuses.includes(invoice.status)) {
            const bucket = getAgeingBucket(invoice.dueDate, fromDate);
            buckets[bucket].push(invoice);
        }
    });

    return buckets;
}

/**
 * Calculate total amount owed for a group of invoices
 * @param {array} invoices - Array of invoice objects with total field
 * @returns {number} Sum of all totals
 */
function calculateTotalOwed(invoices) {
    return Math.round(
        invoices.reduce((sum, inv) => sum + inv.total, 0) * 100
    ) / 100;
}

/**
 * Validate quotation line items
 * @param {array} lineItems - Array of {productId, qty, price}
 * @returns {object} { isValid, errors }
 */
function validateLineItems(lineItems) {
    const errors = [];

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
        errors.push('At least one line item is required');
        return { isValid: false, errors };
    }

    lineItems.forEach((item, index) => {
        if (!item.productId) {
            errors.push(`Line ${index + 1}: Product ID is required`);
        }
        if (typeof item.qty !== 'number' || item.qty <= 0) {
            errors.push(`Line ${index + 1}: Quantity must be a positive number`);
        }
        if (typeof item.price !== 'number' || item.price < 0) {
            errors.push(`Line ${index + 1}: Price must be a non-negative number`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate quotation data
 * @param {object} quotation - Quotation object
 * @returns {object} { isValid, errors }
 */
function validateQuotation(quotation) {
    const errors = [];

    if (!quotation.clientId) {
        errors.push('Client ID is required');
    }
    if (typeof quotation.taxRate !== 'number' || quotation.taxRate < 0 || quotation.taxRate > 100) {
        errors.push('Tax rate must be between 0 and 100');
    }

    const lineItemsValidation = validateLineItems(quotation.lineItems);
    if (!lineItemsValidation.isValid) {
        errors.push(...lineItemsValidation.errors);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate invoice status transition
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - New status to transition to
 * @returns {object} { isValid, message }
 */
function validateStatusTransition(currentStatus, newStatus) {
    const validStatuses = ['Draft', 'Sent', 'Paid', 'Overdue'];

    if (!validStatuses.includes(newStatus)) {
        return { isValid: false, message: `Invalid status: ${newStatus}` };
    }

    // Any status can transition to any other status (no strict state machine)
    return { isValid: true, message: 'Valid transition' };
}

/**
 * Calculate invoice ageing summary
 * @param {array} invoices - All invoices
 * @param {string} fromDate - Date to calculate from (default: today)
 * @returns {object} Summary with totals per bucket
 */
function calculateAgeingSummary(invoices, fromDate = null) {
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid');
    const buckets = groupInvoicesByAgeing(unpaidInvoices, ['Draft', 'Sent', 'Overdue'], fromDate);

    return {
        current: {
            count: buckets.current.length,
            total: calculateTotalOwed(buckets.current)
        },
        overdue31to60: {
            count: buckets['overdue-31-60'].length,
            total: calculateTotalOwed(buckets['overdue-31-60'])
        },
        overdue61to90: {
            count: buckets['overdue-61-90'].length,
            total: calculateTotalOwed(buckets['overdue-61-90'])
        },
        overdue90plus: {
            count: buckets['overdue-90+'].length,
            total: calculateTotalOwed(buckets['overdue-90+'])
        },
        grandTotal: calculateTotalOwed(unpaidInvoices)
    };
}

// Export for Node.js (Jest)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateQuotationTotals,
        calculateLineItemSubtotal,
        calculateLineItemsSubtotal,
        getNextInvoiceNumber,
        updateInvoiceCounters,
        calculateDaysUntilDue,
        getUrgencyClass,
        getAgeingBucket,
        groupInvoicesByAgeing,
        calculateTotalOwed,
        validateLineItems,
        validateQuotation,
        validateStatusTransition,
        calculateAgeingSummary
    };
}
