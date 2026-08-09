/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// components
import { Outlet } from "react-router";
import { ContentWrapper } from "@/components/core/content-wrapper";
import IssueEditNotAllowedContextProvider from "@/components/issues/issue-detail/issue-edit-not-allowed-context";
import { ProjectWorkItemDetailsHeader } from "./header";

export default function ProjectIssueDetailsLayout() {
  return (
    <IssueEditNotAllowedContextProvider>
      <ProjectWorkItemDetailsHeader />
      <ContentWrapper className="overflow-hidden">
        <Outlet />
      </ContentWrapper>
    </IssueEditNotAllowedContextProvider>
  );
}
