interface SandboxIframeProps {
  url: string;
  refreshKey?: number;
}

export function SandboxIframe({ url, refreshKey = 0 }: SandboxIframeProps) {
  // Add cache-busting parameter to force fresh load
  const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}_t=${refreshKey}`;

  return (
    <iframe
      key={refreshKey}
      src={cacheBustedUrl}
      className="w-full h-full border-0 bg-white"
      title="Preview"
      allow="cross-origin-isolated"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
    />
  );
}
