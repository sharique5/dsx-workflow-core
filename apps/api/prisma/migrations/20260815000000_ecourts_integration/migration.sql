-- CreateTable
CREATE TABLE "court_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "matter_id" TEXT,
    "cnr" TEXT NOT NULL,
    "case_type" TEXT,
    "case_type_raw" TEXT,
    "case_status" TEXT,
    "court_code" TEXT,
    "court_complex_code" TEXT,
    "filing_number" TEXT,
    "filing_date" TIMESTAMP(3),
    "registration_number" TEXT,
    "registration_date" TIMESTAMP(3),
    "first_hearing_date" TIMESTAMP(3),
    "next_hearing_date" TIMESTAMP(3),
    "decision_date" TIMESTAMP(3),
    "petitioners" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "respondents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "petitioner_advocates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "respondent_advocates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "judges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "hearing_count" INTEGER NOT NULL DEFAULT 0,
    "judgment_count" INTEGER NOT NULL DEFAULT 0,
    "raw_snapshot" JSONB NOT NULL DEFAULT '{}',
    "last_synced_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_orders" (
    "id" TEXT NOT NULL,
    "court_case_id" TEXT NOT NULL,
    "order_date" TIMESTAMP(3),
    "order_type" TEXT,
    "filename" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "court_cases_tenant_id_idx" ON "court_cases"("tenant_id");

-- CreateIndex
CREATE INDEX "court_cases_matter_id_idx" ON "court_cases"("matter_id");

-- CreateIndex
CREATE INDEX "court_cases_tenant_id_next_hearing_date_idx" ON "court_cases"("tenant_id", "next_hearing_date");

-- CreateIndex
CREATE UNIQUE INDEX "court_cases_tenant_id_cnr_key" ON "court_cases"("tenant_id", "cnr");

-- CreateIndex
CREATE INDEX "case_orders_court_case_id_idx" ON "case_orders"("court_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_orders_court_case_id_filename_key" ON "case_orders"("court_case_id", "filename");

-- AddForeignKey
ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_orders" ADD CONSTRAINT "case_orders_court_case_id_fkey" FOREIGN KEY ("court_case_id") REFERENCES "court_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
