import { db } from "@/lib/db";
import { getSettings } from "@/server/queries/settings";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings-form";
import { DemoDataControl } from "@/components/demo-data-control";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, demoCourseCount] = await Promise.all([getSettings(), db.course.count({ where: { isDemo: true } })]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Tune how study time is estimated.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Time estimation</CardTitle>
        </CardHeader>
        <CardBody>
          <SettingsForm settings={settings} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo data</CardTitle>
        </CardHeader>
        <CardBody>
          <DemoDataControl hasDemoData={demoCourseCount > 0} />
        </CardBody>
      </Card>
    </div>
  );
}
