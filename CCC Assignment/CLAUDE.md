# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

Open `index.html` in a browser:
- Double-click `index.html` to launch in default browser
- Or use `Start-Process "path\to\index.html"` in PowerShell
- The app runs entirely in the browser with no build step or server needed

## Project Overview

**Invoice & Quotation Generator** — A lightweight business application for managing clients, creating quotations and invoices, tracking payment status, and generating ageing reports. Built with plain HTML/CSS/JavaScript and localStorage persistence.

**Technology Stack**: Plain HTML5 / CSS3 / JavaScript (no frameworks) + localStorage API + html2pdf library for PDF generation.

## Architecture

### Data Model

All data is stored in a single `appData` object in localStorage under key `'invoice_app_data'`:

```javascript
{
  clients: [
    { id, name, email, address, phone, taxId }
  ],
  products: [
    { id, name, price, description }
  ],
  quotations: [
    { id, clientId, lineItems, subtotal, tax, taxRate, total, createdDate, status }
  ],
  invoices: [
    { id, quotationId, invoiceNumber, clientId, lineItems, subtotal, tax, taxRate, total,
      invoiceDate, dueDate, status, paidDate }
  ],
  invoiceCounters: {
    '2026': 3, // auto-incremented per year
    '2025': 45
  }
}
```

- **Clients**: Store customer information (name, email, address, phone, tax ID).
- **Products/Services**: Store service/product offerings with unit prices.
- **Quotations**: Temporary proposals containing line items, auto-calculated totals. Status transitions: Draft → Sent (when converted to invoice).
- **Invoices**: Formal billing documents linked to quotations. Auto-generated invoice numbers (INV-YYYY-001, INV-YYYY-002, etc.). Status: Draft → Sent → Paid/Overdue.
- **Invoice Counters**: Tracks the next invoice number per calendar year for auto-numbering.

### State Management

Module-level variables track UI state:
- `appData` — the main data structure (loaded from/saved to localStorage)
- `editingClientId`, `editingProductId`, `editingQuotationId` — track which item is being edited (null if none)
- `currentInvoiceForPreview` — ID of invoice currently displayed in preview modal
- `currentInvoiceForStatus` — ID of invoice whose status is being updated

### Data Persistence

- **Save**: `saveData()` writes `appData` to localStorage. Called after any CRUD operation.
- **Load**: `loadData()` reads from localStorage on page load. Returns empty structure if missing or corrupted.
- **Validation**: Data is validated on load; invalid entries are discarded (prevents corruption from manual edits).

### Rendering

Each tab has a dedicated render function:
- `renderClients()` — displays all clients with edit/delete actions
- `renderProducts()` — displays all products with edit/delete actions
- `renderQuotations()` — displays all quotations with edit/convert/delete actions
- `renderInvoices()` — displays all invoices with view/status/delete actions
- `renderAgeingReport()` — groups unpaid invoices by days outstanding

Render functions are called after every data change to keep UI in sync.

### Key Workflows

**Quotation Builder**:
1. Click "New Quotation"
2. Select client and tax rate
3. Add line items by picking products (qty auto-fills unit price, can be overridden)
4. System auto-calculates subtotal, tax, total
5. Save quotation (stored as Draft)

**Convert to Invoice**:
1. From quotations list, click "Convert to Invoice" on a Draft quotation
2. System auto-generates invoice number (INV-2026-001, etc.), invoice date, due date (+30 days)
3. Creates linked invoice, marks quotation as "Sent"
4. Invoice defaults to Draft status

**Invoice Status Tracking**:
1. From invoices list, click "Status" on an invoice
2. Update status: Draft → Sent → Paid/Overdue
3. If status is "Paid", optionally record payment date
4. System does not auto-mark invoices Overdue; user must manually update

**Ageing Report**:
- Groups all unpaid invoices by days outstanding:
  - Current (0-30 days)
  - Overdue (31-60 days)
  - Overdue (61-90 days)
  - Overdue (90+ days)
- Shows total owed per bucket and grand total

**PDF Generation**:
1. From invoices list, click "View" to preview
2. Click "Download PDF" to generate and download file named `INV-YYYY-NNN.pdf`
3. Uses html2pdf library (loaded via CDN)

### Modal Architecture

Modals are pre-defined in HTML, shown/hidden via JavaScript:
- **Client Modal** — add/edit clients
- **Product Modal** — add/edit products
- **Quotation Modal** — build new/edit quotations with dynamic line items
- **Invoice Preview Modal** — displays formatted invoice for view/download
- **Invoice Status Modal** — update invoice status and payment date

Modal state is managed by `editingClientId`, `editingProductId`, `editingQuotationId`, `currentInvoiceForPreview`, `currentInvoiceForStatus`.

### Calculations

**Quotation/Invoice Totals**:
- Subtotal = sum of (qty × price) for all line items
- Tax = subtotal × (taxRate / 100)
- Total = subtotal + tax

**Ageing Calculation**:
- Compare invoice due date to today
- daysOverdue = floor((today - dueDate) / milliseconds-per-day)
- Bucket based on daysOverdue value

### Data Format Notes

- **IDs**: Generated using `Date.now() + random suffix` (unique enough for client-side)
- **Dates**: Stored as ISO strings (e.g., "2026-09-26")
- **Prices**: Stored as numbers; formatted to 2 decimal places for display
- **Line Items**: Array of `{productId, qty, price}` — price can differ from product's base price (custom quotes allowed)
- **Tax Rate**: Flat percentage applied to entire quotation/invoice (not per-line-item)
- **Invoice Number**: Auto-formatted as `INV-YYYY-NNN` where NNN is zero-padded counter

## File Structure

- **`index.html`** — Page structure. Five tabs (Clients, Products, Quotations, Invoices, Ageing Report). Five modal dialogs for CRUD operations.
- **`style.css`** — Responsive design with flexbox layout. CSS custom properties for light/dark theme. Status badge styles (Draft/Sent/Paid/Overdue). Invoice preview print-friendly styling.
- **`app.js`** — All application logic: CRUD operations, state management, modal handlers, calculations, localStorage persistence, PDF download.

## Testing the App

**Clients**:
- Add a client with all fields. Edit and update. Delete. Verify persistence after reload.

**Products**:
- Add multiple products with different prices. Edit a product price and verify quotations reflect the change only for new line items (not retroactively).
- Delete a product. Verify old quotations still reference the product ID (won't break).

**Quotations**:
- Create quotation: select client, set tax rate, add line items.
- Verify line item prices auto-populate from product, but can be overridden.
- Verify subtotal, tax, total update in real-time as qty/price changes.
- Edit quotation and change tax rate; verify totals recalculate.
- Delete quotation. Verify removed from list.

**Invoices (from Quotations)**:
- Convert a quotation to invoice. Verify:
  - Invoice number is auto-generated and sequential (INV-2026-001, INV-2026-002, etc.)
  - Invoice date is today
  - Due date is 30 days from today
  - Invoice links to quotation (data preserved)
  - Quotation status changes to "Sent"
  - Invoices tab shows new invoice as Draft
- Click "View" on invoice; verify preview renders all line items and correct totals
- Click "Download PDF"; verify PDF file downloads with correct invoice number as filename
- Click "Status"; change status to Sent, Paid, Overdue. Verify status badge updates.
- If status is Paid, set payment date and verify it's saved.

**Ageing Report**:
- Create invoices with various due dates (past, today, future, 60 days, 90 days).
- Mark some as Paid (they disappear from report).
- Leave some as Draft/Sent/Overdue.
- View Ageing Report; verify invoices are grouped correctly by days outstanding.
- Verify grand total matches sum of all unpaid invoices.

**Dark Mode**:
- Click theme toggle (🌙/☀️). Verify colors invert throughout app.
- Reload page. Verify theme persists from localStorage.

**Data Persistence**:
- Add data, reload page. Verify all clients, products, quotations, invoices still present.
- Manually delete localStorage key `'invoice_app_data'` in DevTools. Refresh page. Verify app resets to empty state.

## Implementation Patterns

- **Inline editing with modals**: No in-row editing. All CRUD happens in modals for clarity and consistency.
- **Auto-numbering**: Invoice numbers are auto-generated per-year and persisted in `invoiceCounters`. Each conversion increments the counter.
- **Linking**: Quotations and invoices are linked via `quotationId` field; allows tracing a quotation through to its invoice(s).
- **Line item flexibility**: Line item prices can override product base prices; useful for discounts, custom rates.
- **Non-destructive PDF**: PDF download uses html2pdf library; does not mutate data.
- **Ageing by due date**: Report groups unpaid invoices by how many days past due, not by creation date.

## Known Limitations & Future Work

- **Email delivery** (stretch goal): Not yet implemented. Infrastructure would need a backend service (SendGrid, Mailgun, etc.).
- **Invoice status automation**: Manual marking as Overdue required. Could auto-check due date on page load.
- **Multi-currency**: No currency support; assumes single currency throughout.
- **Recurring invoices**: Not supported. Each invoice is a one-time document.
- **Discounts**: No line-item or invoice-level discount fields.
- **Payment tracking**: No payment amount/partial payment tracking. Status is binary (Paid/not Paid).

## Performance Notes

- App stores all data in localStorage (typically 5-10 MB limit). Suitable for small to medium businesses (up to thousands of invoices).
- No database queries or backend latency.
- PDF generation is client-side and can be slow for large invoices (100+ line items).

## Testing

The app includes a comprehensive Jest test suite covering all core business logic rules.

**Running Tests**:
```bash
npm install  # First time only
npm test     # Run all tests
npm test:watch  # Run tests in watch mode (re-run on file changes)
npm run test:coverage  # Run tests with coverage report
```

**Test Coverage**:
- **64 tests, 100% passing**
- **100% statement coverage**
- **92.53% branch coverage**

**Test Suites**:

1. **Quotation Calculations** (8 tests)
   - Subtotal, tax, total calculations with various tax rates
   - Edge cases: zero amounts, decimals, negative values (error handling)

2. **Line Item Calculations** (6 tests)
   - Single line item subtotal
   - Multiple line items summation
   - Decimal precision and rounding

3. **Invoice Numbering** (10 tests)
   - Sequential auto-generation per calendar year
   - Zero-padding (INV-2026-001, INV-2026-010, etc.)
   - Multi-year counter independence
   - Counter state management

4. **Date Calculations & Ageing** (13 tests)
   - Days until due (positive/negative/zero)
   - Urgency classification (overdue, due-today, due-soon, due-later)
   - Ageing buckets (current 0-30d, 31-60d, 61-90d, 90+d)
   - Timezone-aware date handling

5. **Ageing Report** (6 tests)
   - Grouping invoices by ageing bucket
   - Filtering by status
   - Total calculations per bucket
   - Ageing summary with counts and totals

6. **Validation** (11 tests)
   - Line item validation (productId, qty, price constraints)
   - Quotation validation (clientId, taxRate, lineItems)
   - Status transition validation
   - Error collection and messaging

**Business Logic Module** (`business-logic.js`):

The core business logic is extracted into a separate module for testability and potential backend reuse. All calculation and validation functions are unit-tested independently of UI.

Functions available for import (Node.js):
- `calculateQuotationTotals(subtotal, taxRate)`
- `calculateLineItemSubtotal(qty, price)`
- `calculateLineItemsSubtotal(lineItems)`
- `getNextInvoiceNumber(invoiceCounters, year)`
- `updateInvoiceCounters(counters, year)`
- `calculateDaysUntilDue(dueDate, fromDate)`
- `getUrgencyClass(dueDate, fromDate)`
- `getAgeingBucket(dueDate, fromDate)`
- `groupInvoicesByAgeing(invoices, statuses, fromDate)`
- `calculateTotalOwed(invoices)`
- `validateLineItems(lineItems)`
- `validateQuotation(quotation)`
- `validateStatusTransition(currentStatus, newStatus)`
- `calculateAgeingSummary(invoices, fromDate)`

## Debugging Tips

- Open DevTools (F12) → Application → LocalStorage → Find `'invoice_app_data'` key to inspect stored data.
- Log `appData` in console to verify state.
- Check browser console for any JSON parse errors in `loadData()` (usually indicates localStorage corruption).
- Run `npm test` to verify business logic integrity before integrating changes.
