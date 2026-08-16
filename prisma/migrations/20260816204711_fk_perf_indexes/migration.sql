-- CreateIndex
CREATE INDEX "Attachment_taskId_idx" ON "Attachment"("taskId");

-- CreateIndex
CREATE INDEX "Client_categoryId_idx" ON "Client"("categoryId");

-- CreateIndex
CREATE INDEX "ClientContact_contactId_idx" ON "ClientContact"("contactId");

-- CreateIndex
CREATE INDEX "ClientLoginEvent_clientContactId_idx" ON "ClientLoginEvent"("clientContactId");

-- CreateIndex
CREATE INDEX "Deliverable_taskId_idx" ON "Deliverable"("taskId");

-- CreateIndex
CREATE INDEX "Document_clientId_idx" ON "Document"("clientId");

-- CreateIndex
CREATE INDEX "Document_typeId_idx" ON "Document"("typeId");

-- CreateIndex
CREATE INDEX "Document_uploadedByAdminId_idx" ON "Document"("uploadedByAdminId");

-- CreateIndex
CREATE INDEX "PaymentRecord_clientId_idx" ON "PaymentRecord"("clientId");

-- CreateIndex
CREATE INDEX "PortfolioMediaItem_pillarId_idx" ON "PortfolioMediaItem"("pillarId");

-- CreateIndex
CREATE INDEX "Prospect_statusId_idx" ON "Prospect"("statusId");

-- CreateIndex
CREATE INDEX "Task_clientId_idx" ON "Task"("clientId");

-- CreateIndex
CREATE INDEX "Task_statusId_idx" ON "Task"("statusId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskRefusalHistory_taskId_idx" ON "TaskRefusalHistory"("taskId");

-- CreateIndex
CREATE INDEX "TaskStatusHistory_taskId_changedAt_idx" ON "TaskStatusHistory"("taskId", "changedAt");

-- CreateIndex
CREATE INDEX "TaskTimeEntry_taskId_idx" ON "TaskTimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TaskTimeEntry_startedByAdminId_idx" ON "TaskTimeEntry"("startedByAdminId");
