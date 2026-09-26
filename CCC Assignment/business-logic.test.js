const {
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
} = require('./business-logic');

describe('Quotation Calculations', () => {
    describe('calculateQuotationTotals', () => {
        test('calculates subtotal, tax, and total correctly', () => {
            const result = calculateQuotationTotals(100, 10);
            expect(result.subtotal).toBe(100);
            expect(result.tax).toBe(10);
            expect(result.total).toBe(110);
            expect(result.taxRate).toBe(10);
        });

        test('handles zero subtotal', () => {
            const result = calculateQuotationTotals(0, 10);
            expect(result.subtotal).toBe(0);
            expect(result.tax).toBe(0);
            expect(result.total).toBe(0);
        });

        test('handles zero tax rate', () => {
            const result = calculateQuotationTotals(100, 0);
            expect(result.subtotal).toBe(100);
            expect(result.tax).toBe(0);
            expect(result.total).toBe(100);
        });

        test('calculates high tax rate correctly', () => {
            const result = calculateQuotationTotals(1000, 25);
            expect(result.subtotal).toBe(1000);
            expect(result.tax).toBe(250);
            expect(result.total).toBe(1250);
        });

        test('handles decimal amounts', () => {
            const result = calculateQuotationTotals(99.99, 8.5);
            expect(result.subtotal).toBe(99.99);
            expect(result.tax).toBeCloseTo(8.5, 1);
            expect(result.total).toBeCloseTo(108.49, 1);
        });

        test('throws error on negative subtotal', () => {
            expect(() => calculateQuotationTotals(-100, 10)).toThrow();
        });

        test('throws error on negative tax rate', () => {
            expect(() => calculateQuotationTotals(100, -10)).toThrow();
        });

        test('throws error on tax rate > 100', () => {
            expect(() => calculateQuotationTotals(100, 150)).toThrow();
        });
    });

    describe('calculateLineItemSubtotal', () => {
        test('calculates line item subtotal correctly', () => {
            expect(calculateLineItemSubtotal(5, 20)).toBe(100);
        });

        test('handles decimal quantities and prices', () => {
            expect(calculateLineItemSubtotal(2.5, 19.99)).toBeCloseTo(49.98, 1);
        });

        test('handles zero quantity', () => {
            expect(calculateLineItemSubtotal(0, 100)).toBe(0);
        });

        test('handles zero price', () => {
            expect(calculateLineItemSubtotal(10, 0)).toBe(0);
        });

        test('throws error on negative quantity', () => {
            expect(() => calculateLineItemSubtotal(-5, 20)).toThrow();
        });

        test('throws error on negative price', () => {
            expect(() => calculateLineItemSubtotal(5, -20)).toThrow();
        });
    });

    describe('calculateLineItemsSubtotal', () => {
        test('sums multiple line items correctly', () => {
            const lineItems = [
                { qty: 5, price: 10 },
                { qty: 3, price: 20 },
                { qty: 2, price: 15 }
            ];
            expect(calculateLineItemsSubtotal(lineItems)).toBe(140);
        });

        test('handles empty line items array', () => {
            expect(calculateLineItemsSubtotal([])).toBe(0);
        });

        test('handles single line item', () => {
            expect(calculateLineItemsSubtotal([{ qty: 5, price: 20 }])).toBe(100);
        });

        test('handles decimal amounts', () => {
            const lineItems = [
                { qty: 2.5, price: 19.99 },
                { qty: 1, price: 50.01 }
            ];
            const result = calculateLineItemsSubtotal(lineItems);
            expect(result).toBeCloseTo(99.98, 1);
        });
    });
});

describe('Invoice Numbering', () => {
    describe('getNextInvoiceNumber', () => {
        test('generates first invoice number for a year', () => {
            const result = getNextInvoiceNumber({}, 2026);
            expect(result.invoiceNumber).toBe('INV-2026-001');
            expect(result.nextCounter).toBe(1);
            expect(result.year).toBe(2026);
        });

        test('generates sequential invoice numbers', () => {
            const counters1 = { 2026: 1 };
            const result = getNextInvoiceNumber(counters1, 2026);
            expect(result.invoiceNumber).toBe('INV-2026-002');
            expect(result.nextCounter).toBe(2);
        });

        test('generates invoice numbers with zero padding', () => {
            const result = getNextInvoiceNumber({ 2026: 9 }, 2026);
            expect(result.invoiceNumber).toBe('INV-2026-010');
        });

        test('generates invoice numbers with three digit padding', () => {
            const result = getNextInvoiceNumber({ 2026: 999 }, 2026);
            expect(result.invoiceNumber).toBe('INV-2026-1000');
        });

        test('handles different years independently', () => {
            const counters = { 2025: 45, 2026: 10 };
            const result2025 = getNextInvoiceNumber(counters, 2025);
            const result2026 = getNextInvoiceNumber(counters, 2026);
            expect(result2025.invoiceNumber).toBe('INV-2025-046');
            expect(result2026.invoiceNumber).toBe('INV-2026-011');
        });

        test('uses current year if not specified', () => {
            const currentYear = new Date().getFullYear();
            const result = getNextInvoiceNumber({});
            expect(result.invoiceNumber).toContain(`INV-${currentYear}-001`);
        });
    });

    describe('updateInvoiceCounters', () => {
        test('increments counter for existing year', () => {
            const counters = { 2026: 5 };
            const updated = updateInvoiceCounters(counters, 2026);
            expect(updated[2026]).toBe(6);
        });

        test('creates counter for new year', () => {
            const counters = { 2025: 10 };
            const updated = updateInvoiceCounters(counters, 2026);
            expect(updated[2026]).toBe(1);
        });

        test('does not mutate original counters', () => {
            const counters = { 2026: 5 };
            updateInvoiceCounters(counters, 2026);
            expect(counters[2026]).toBe(5);
        });

        test('handles empty counters object', () => {
            const updated = updateInvoiceCounters({}, 2026);
            expect(updated[2026]).toBe(1);
        });
    });
});

describe('Date Calculations & Ageing', () => {
    describe('calculateDaysUntilDue', () => {
        test('calculates days until future date', () => {
            const futureDate = '2026-12-31';
            const fromDate = '2026-12-20';
            expect(calculateDaysUntilDue(futureDate, fromDate)).toBe(11);
        });

        test('calculates due today as 0', () => {
            const today = '2026-09-26';
            expect(calculateDaysUntilDue(today, today)).toBe(0);
        });

        test('calculates overdue as negative', () => {
            const pastDate = '2026-09-20';
            const fromDate = '2026-09-26';
            expect(calculateDaysUntilDue(pastDate, fromDate)).toBe(-6);
        });

        test('handles 30 day payment terms', () => {
            const invoiceDate = '2026-09-26';
            const dueDate = '2026-10-26';
            expect(calculateDaysUntilDue(dueDate, invoiceDate)).toBe(30);
        });

        test('uses current date if fromDate not provided', () => {
            // We can't test exact value without mocking, but it should not throw
            expect(() => calculateDaysUntilDue('2099-12-31')).not.toThrow();
        });
    });

    describe('getUrgencyClass', () => {
        test('returns overdue for past due dates', () => {
            const pastDate = '2026-09-20';
            const fromDate = '2026-09-26';
            expect(getUrgencyClass(pastDate, fromDate)).toBe('overdue');
        });

        test('returns due-today for today', () => {
            const today = '2026-09-26';
            expect(getUrgencyClass(today, today)).toBe('due-today');
        });

        test('returns due-soon for 1-3 days', () => {
            const fromDate = '2026-09-26';
            expect(getUrgencyClass('2026-09-27', fromDate)).toBe('due-soon');
            expect(getUrgencyClass('2026-09-28', fromDate)).toBe('due-soon');
            expect(getUrgencyClass('2026-09-29', fromDate)).toBe('due-soon');
        });

        test('returns due-later for 4+ days', () => {
            const fromDate = '2026-09-26';
            expect(getUrgencyClass('2026-09-30', fromDate)).toBe('due-later');
            expect(getUrgencyClass('2026-12-31', fromDate)).toBe('due-later');
        });
    });

    describe('getAgeingBucket', () => {
        test('returns current for not yet overdue', () => {
            const today = '2026-09-26';
            const futureDate = '2026-10-26';
            expect(getAgeingBucket(futureDate, today)).toBe('current');
        });

        test('returns current for today', () => {
            const today = '2026-09-26';
            expect(getAgeingBucket(today, today)).toBe('current');
        });

        test('returns overdue-31-60 for 31-60 days overdue', () => {
            const today = '2026-09-26';
            const past45Days = '2026-08-12';
            expect(getAgeingBucket(past45Days, today)).toBe('overdue-31-60');
        });

        test('returns overdue-61-90 for 61-90 days overdue', () => {
            const today = '2026-09-26';
            const past75Days = '2026-07-13';
            expect(getAgeingBucket(past75Days, today)).toBe('overdue-61-90');
        });

        test('returns overdue-90+ for 90+ days overdue', () => {
            const today = '2026-09-26';
            const past120Days = '2026-05-28';
            expect(getAgeingBucket(past120Days, today)).toBe('overdue-90+');
        });
    });
});

describe('Ageing Report', () => {
    describe('groupInvoicesByAgeing', () => {
        const today = '2026-09-26';
        const invoices = [
            { id: '1', dueDate: '2026-10-26', status: 'Draft', total: 1000 },    // current
            { id: '2', dueDate: '2026-08-12', status: 'Sent', total: 500 },      // 31-60 days
            { id: '3', dueDate: '2026-07-13', status: 'Overdue', total: 750 },   // 61-90 days
            { id: '4', dueDate: '2026-05-28', status: 'Draft', total: 250 },     // 90+ days
            { id: '5', dueDate: '2026-09-20', status: 'Paid', total: 100 }       // should exclude (Paid)
        ];

        test('groups invoices correctly by ageing bucket', () => {
            const result = groupInvoicesByAgeing(invoices, ['Draft', 'Sent', 'Overdue'], today);
            expect(result.current.length).toBe(1);
            expect(result['overdue-31-60'].length).toBe(1);
            expect(result['overdue-61-90'].length).toBe(1);
            expect(result['overdue-90+'].length).toBe(1);
        });

        test('excludes paid invoices by default', () => {
            const result = groupInvoicesByAgeing(invoices, ['Draft', 'Sent', 'Overdue'], today);
            expect(result.current.length + result['overdue-31-60'].length +
                   result['overdue-61-90'].length + result['overdue-90+'].length).toBe(4);
        });

        test('can include only specific statuses', () => {
            const result = groupInvoicesByAgeing(invoices, ['Draft'], today);
            expect(result.current.length).toBe(1);
            expect(result['overdue-90+'].length).toBe(1);
        });

        test('handles empty invoices array', () => {
            const result = groupInvoicesByAgeing([], ['Draft', 'Sent', 'Overdue'], today);
            expect(result.current.length).toBe(0);
            expect(result['overdue-31-60'].length).toBe(0);
            expect(result['overdue-61-90'].length).toBe(0);
            expect(result['overdue-90+'].length).toBe(0);
        });
    });

    describe('calculateTotalOwed', () => {
        test('sums invoice totals correctly', () => {
            const invoices = [
                { total: 1000 },
                { total: 500 },
                { total: 250 }
            ];
            expect(calculateTotalOwed(invoices)).toBe(1750);
        });

        test('handles empty array', () => {
            expect(calculateTotalOwed([])).toBe(0);
        });

        test('handles decimal amounts', () => {
            const invoices = [
                { total: 99.99 },
                { total: 50.01 }
            ];
            expect(calculateTotalOwed(invoices)).toBeCloseTo(150, 1);
        });
    });

    describe('calculateAgeingSummary', () => {
        test('provides summary of unpaid invoices by ageing', () => {
            const today = '2026-09-26';
            const invoices = [
                { dueDate: '2026-10-26', status: 'Draft', total: 1000 },
                { dueDate: '2026-08-12', status: 'Sent', total: 500 },
                { dueDate: '2026-07-13', status: 'Overdue', total: 750 },
                { dueDate: '2026-05-28', status: 'Draft', total: 250 },
                { dueDate: '2026-09-20', status: 'Paid', total: 100 }
            ];

            const summary = calculateAgeingSummary(invoices, today);
            expect(summary.current.count).toBe(1);
            expect(summary.current.total).toBe(1000);
            expect(summary.overdue31to60.count).toBe(1);
            expect(summary.overdue31to60.total).toBe(500);
            expect(summary.overdue61to90.count).toBe(1);
            expect(summary.overdue61to90.total).toBe(750);
            expect(summary.overdue90plus.count).toBe(1);
            expect(summary.overdue90plus.total).toBe(250);
            expect(summary.grandTotal).toBe(2500);
        });

        test('excludes paid invoices from summary', () => {
            const invoices = [
                { dueDate: '2026-09-20', status: 'Paid', total: 1000 },
                { dueDate: '2026-09-20', status: 'Paid', total: 500 }
            ];
            const summary = calculateAgeingSummary(invoices);
            expect(summary.grandTotal).toBe(0);
        });
    });
});

describe('Validation', () => {
    describe('validateLineItems', () => {
        test('validates valid line items', () => {
            const lineItems = [
                { productId: 'p1', qty: 5, price: 10 },
                { productId: 'p2', qty: 2, price: 20 }
            ];
            const result = validateLineItems(lineItems);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        test('rejects empty line items array', () => {
            const result = validateLineItems([]);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('rejects line item with missing productId', () => {
            const lineItems = [{ qty: 5, price: 10 }];
            const result = validateLineItems(lineItems);
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('Product ID is required');
        });

        test('rejects line item with invalid quantity', () => {
            const lineItems = [{ productId: 'p1', qty: -5, price: 10 }];
            const result = validateLineItems(lineItems);
            expect(result.isValid).toBe(false);
        });

        test('rejects line item with negative price', () => {
            const lineItems = [{ productId: 'p1', qty: 5, price: -10 }];
            const result = validateLineItems(lineItems);
            expect(result.isValid).toBe(false);
        });

        test('accepts zero price', () => {
            const lineItems = [{ productId: 'p1', qty: 5, price: 0 }];
            const result = validateLineItems(lineItems);
            expect(result.isValid).toBe(true);
        });

        test('collects multiple errors', () => {
            const lineItems = [
                { qty: -5, price: 10 },
                { productId: 'p1', qty: 'invalid', price: -10 }
            ];
            const result = validateLineItems(lineItems);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    describe('validateQuotation', () => {
        test('validates complete valid quotation', () => {
            const quotation = {
                clientId: 'c1',
                taxRate: 10,
                lineItems: [
                    { productId: 'p1', qty: 5, price: 10 }
                ]
            };
            const result = validateQuotation(quotation);
            expect(result.isValid).toBe(true);
        });

        test('rejects quotation with missing clientId', () => {
            const quotation = {
                taxRate: 10,
                lineItems: [{ productId: 'p1', qty: 5, price: 10 }]
            };
            const result = validateQuotation(quotation);
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('Client ID is required');
        });

        test('rejects quotation with invalid tax rate', () => {
            const quotation = {
                clientId: 'c1',
                taxRate: 150,
                lineItems: [{ productId: 'p1', qty: 5, price: 10 }]
            };
            const result = validateQuotation(quotation);
            expect(result.isValid).toBe(false);
        });

        test('rejects quotation with empty line items', () => {
            const quotation = {
                clientId: 'c1',
                taxRate: 10,
                lineItems: []
            };
            const result = validateQuotation(quotation);
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateStatusTransition', () => {
        test('allows valid status transitions', () => {
            const statuses = ['Draft', 'Sent', 'Paid', 'Overdue'];
            statuses.forEach(status => {
                const result = validateStatusTransition('Draft', status);
                expect(result.isValid).toBe(true);
            });
        });

        test('rejects invalid status', () => {
            const result = validateStatusTransition('Draft', 'Invalid');
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('Invalid status');
        });
    });
});
