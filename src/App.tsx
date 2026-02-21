import { AuthButton } from "@/components/AuthButton";
import { TodaysDiary } from "@/components/TodaysDiary";
import { DocSelector } from "@/components/DocSelector";
import { EntryForm } from "@/components/EntryForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedDoc } from "@/hooks/useSelectedDoc";

export default function App() {
  const { accessToken, setToken, clearToken } = useAuth();
  const { selectedDoc, selectDoc } = useSelectedDoc();

  return (
    <div
      className="bg-background flex min-h-screen items-start justify-center px-4
        pt-16"
    >
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">gdoc-logs</h1>
          <AuthButton
            isLoggedIn={!!accessToken}
            onLogin={setToken}
            onLogout={clearToken}
          />
        </div>

        {!accessToken ? (
          <p className="text-muted-foreground text-sm">
            Google でサインインすると Google Docs に追記できます。
          </p>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ドキュメント選択</CardTitle>
              </CardHeader>
              <CardContent>
                <DocSelector
                  accessToken={accessToken}
                  apiKey={import.meta.env.VITE_GOOGLE_API_KEY}
                  selectedDoc={selectedDoc}
                  onSelect={selectDoc}
                />
              </CardContent>
            </Card>

            {selectedDoc && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">直近のログ</CardTitle>
                </CardHeader>
                <CardContent>
                  <TodaysDiary
                    docId={selectedDoc.id}
                    accessToken={accessToken}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedDoc ? selectedDoc.name : "追記"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EntryForm
                  accessToken={accessToken}
                  selectedDoc={selectedDoc}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Toaster />
    </div>
  );
}
