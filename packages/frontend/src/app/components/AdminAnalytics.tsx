import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  BarChart3,
  AlertTriangle,
  Users,
  Target,
  Activity,
  Clock,
} from "lucide-react";

export function AdminAnalytics() {
  const COLORS = {
    primary: "#3B82F6",
    warning: "#F59E0B",
    critical: "#EA5B1F",
    navy: "#0F2F56",
  };

  const riskData = [
    { name: "0-10%", count: 42 },
    { name: "10-20%", count: 58 },
    { name: "20-30%", count: 72 },
    { name: "30-40%", count: 65 },
    { name: "40-50%", count: 48 },
    { name: "50-60%", count: 35 },
    { name: "60-70%", count: 28 },
    { name: "70-80%", count: 18 },
    { name: "80-90%", count: 12 },
    { name: "90-100%", count: 8 },
  ];

  const alertStatus = [
    {
      name: "Resolved",
      value: 65,
      color: COLORS.primary,
    },
    {
      name: "Acknowledged",
      value: 22,
      color: COLORS.warning,
    },
    {
      name: "Active",
      value: 13,
      color: COLORS.critical,
    },
  ];

  const responseData = [
    {
      role: "Junior Clinician",
      time: 6.4,
    },
    {
      role: "Senior Clinician",
      time: 3.8,
    },
    {
      role: "Admin",
      time: 2.1,
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5 text-slate-700" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Admin Analytics
            </h1>
            <p className="text-sm text-slate-500">
              Model performance and operational metrics
            </p>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <StatCard
            title="Total Alerts"
            value="847"
            icon={AlertTriangle}
          />

          <StatCard
            title="False Positives"
            value="12.4%"
            icon={Target}
          />

          <StatCard
            title="Avg ACK Time"
            value="4.2 min"
            icon={Clock}
          />

          <StatCard
            title="Model AUC"
            value="0.87"
            icon={Activity}
          />

          <StatCard
            title="Active Users"
            value="18"
            icon={Users}
          />

          <StatCard
            title="Acceptance Rate"
            value="78%"
            icon={Target}
          />
        </div>

        {/* TOP ROW */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Card title="Risk Score Distribution">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    fill={COLORS.primary}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Alert Status">
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertStatus}
                    dataKey="value"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                  >
                    {alertStatus.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6 mt-2 text-sm font-medium">
              {alertStatus.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />

                  {item.name} {item.value}%
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* SECOND ROW */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Card title="Response Time by Role">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={responseData}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis type="number" />

                  <YAxis
                    type="category"
                    dataKey="role"
                  />

                  <Tooltip />

                  <Bar
                    dataKey="time"
                    fill={COLORS.navy}
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Performance Metrics">
            <div className="space-y-5 mt-2">
              <MetricBar
                label="AUC-ROC"
                value={87}
                color={COLORS.critical}
              />

              <MetricBar
                label="Sensitivity"
                value={81}
                color={COLORS.warning}
              />

              <MetricBar
                label="Specificity"
                value={79}
                color={COLORS.navy}
              />

              <MetricBar
                label="PPV"
                value={76}
                color={COLORS.navy}
              />

              <MetricBar
                label="NPV"
                value={91}
                color={COLORS.navy}
              />

              <MetricBar
                label="F1 Score"
                value={78}
                color={COLORS.navy}
              />
            </div>
          </Card>
        </div>

        {/* BOTTOM CARDS */}
        <div className="grid grid-cols-3 gap-6">
          <InfoCard
            title="Model Details"
            rows={[
              ["Algorithm", "XGBoost + LSTM"],
              ["Calibration", "Platt Scaling"],
              ["Training Data", "MIMIC-IV"],
              ["Features", "42 Variables"],
              ["Prediction Horizon", "6 Hours"],
              ["Last Updated", "May 2026"],
            ]}
          />

          <InfoCard
            title="Training Information"
            rows={[
              ["ICU Stays", "52,847"],
              ["Split Method", "Time-based"],
              ["Train/Test", "80 / 20"],
              ["Cross Validation", "5-fold"],
              ["Validation AUC", "0.85"],
              ["External Test", "Passed"],
            ]}
          />

          <InfoCard
            title="Clinical Impact"
            rows={[
              ["Alerts Acknowledged", "78%"],
              ["Escalated Cases", "24%"],
              ["Median Lead Time", "5.8 hrs"],
              ["Avg Response Time", "4.2 min"],
              ["False Alert Rate", "12.4%"],
              ["Alert Fatigue Risk", "Low"],
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md">
      <h2 className="text-lg font-bold text-slate-900 mb-6">
        {title}
      </h2>

      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
            {title}
          </p>

          <p className="text-2xl font-bold text-slate-900 mt-1">
            {value}
          </p>
        </div>

        <Icon className="w-5 h-5 text-slate-500" />
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-slate-600">
          {label}
        </span>

        <span className="font-semibold text-slate-900">
          {value}%
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function InfoCard({
  title,
  rows,
}: {
  title: string;
  rows: string[][];
}) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md">
      <h2 className="text-lg font-bold text-slate-900 mb-5">
        {title}
      </h2>

      <div className="space-y-4">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between items-center border-b border-slate-100 pb-3"
          >
            <span className="text-slate-500">
              {label}
            </span>

            <span className="font-semibold text-slate-900 text-right">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}