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
