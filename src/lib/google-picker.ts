const GAPI_URL = 'https://apis.google.com/js/api.js'
const DOCS_MIME_TYPE = 'application/vnd.google-apps.document'

export interface PickedFile {
  id: string
  name: string
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = url
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`スクリプトの読み込みに失敗しました: ${url}`))
    document.head.appendChild(script)
  })
}

function loadPickerLib(): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).gapi.load('picker', resolve)
  })
}

/**
 * Google Picker を開き、ユーザーが選択したドキュメント情報を返す。
 * キャンセルした場合は null を返す。
 */
export async function openGooglePicker(
  accessToken: string,
  apiKey: string,
): Promise<PickedFile | null> {
  await loadScript(GAPI_URL)
  await loadPickerLib()

  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { picker } = (window as any).google

    const view = new picker.DocsView()
    view.setMimeTypes(DOCS_MIME_TYPE)

    const pickerInstance = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setTitle('追記先のドキュメントを選択')
      .setCallback(
        (data: { action: string; docs: Array<{ id: string; name: string }> }) => {
          if (data.action === picker.Action.PICKED) {
            const doc = data.docs[0]
            resolve({ id: doc.id, name: doc.name })
          } else if (data.action === picker.Action.CANCEL) {
            resolve(null)
          }
        },
      )
      .build()

    pickerInstance.setVisible(true)
  })
}
