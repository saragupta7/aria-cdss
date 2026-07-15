import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Dashboard } from "./components/Dashboard";
import { AlertCenter } from "./components/AlertCenter";
import { PatientDetail } from "./components/PatientDetail";
import { Simulation } from "./components/Simulation";
import { AdminAnalytics } from "./components/AdminAnalytics";
import { AuditTrail } from "./components/AuditTrail";
import { Profile } from "./components/Profile";
import { WardDetail } from "./components/WardDetail";
import { WardOverview } from "./components/WardOverview";
import { Landing } from "./components/Landing";
import { Login } from "./components/Login";
import { ChangePassword } from "./components/PasswordReset";
import { NotFound } from "./components/NotFound";
import { StaffManagement } from "./components/StaffManagement";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/change-password",
    Component: ChangePassword,
  },
  {
    path: "/dashboard",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "alerts", Component: AlertCenter },
      { path: "wards", Component: WardOverview },
      { path: "patient/:id", Component: PatientDetail },
      { path: "simulation", Component: Simulation },
      { path: "analytics", Component: AdminAnalytics },
      { path: "audit", Component: AuditTrail },
      { path: "profile", Component: Profile },
      { path: "ward/:wardId", Component: WardDetail },
      { path: "staff", Component: StaffManagement },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
