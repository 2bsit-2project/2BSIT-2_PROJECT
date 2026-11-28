Sprint 2 Test Cases: Soft Delete, Restore & Active Child Checks

Task: S2-TST-03
Project: Hope, Inc. ERP

1. Test Cases: Customer Soft Delete & Restore
- TC-SD-01: Deactivate an active customer (DELETE /api/customers/:custno) -> Customer status changes to Inactive, stamp updates, and record is hidden from default Active list while remaining stored in the database.
- TC-SD-02: Filter customer list by Status = Inactive or All -> Soft-deleted customer appears with Inactive badge and a Restore action button.
- TC-SD-03: Restore an inactive customer (PATCH /api/customers/:custno/restore) -> Customer status returns to Active, stamp updates, and record reappears in the default Active list.
- TC-SD-04: Attempt to soft delete or restore a non-existent customer number -> System returns 404 Customer not found.

2. Test Cases: Product Soft Delete & Restore
- TC-SD-05: Deactivate an active product (DELETE /api/products/:prodcode) -> Product status changes to Inactive, stamp updates, and record is hidden from default Active list without erasing historical data.
- TC-SD-06: Filter product list by Status = Inactive or All -> Soft-deleted product appears with Inactive badge and Restore button.
- TC-SD-07: Restore an inactive product (PATCH /api/products/:prodcode/restore) -> Product status returns to Active and reappears in the default Active list.
- TC-SD-08: Attempt to soft delete or restore a non-existent product code -> System returns 404 Product not found.

3. Test Cases: Delete Blocked by Active Child Records
- TC-SD-09: Attempt to permanently delete a customer referenced by active sales records -> Database foreign-key / child-record check blocks physical deletion and preserves referential integrity; soft delete must be used instead.
- TC-SD-10: Attempt to permanently delete a product referenced by active salesDetail or priceHist records -> Database foreign-key / child-record check blocks deletion and prevents orphaned child rows.
- TC-SD-11: Verify soft-deleted customer or product retains linked sales and price history records -> Historical transactions and price history remain intact and queryable for audit reporting.
