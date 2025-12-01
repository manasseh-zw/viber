interface SandboxIframeProps {
  url: string;
  refreshKey?: number;
}

export function SandboxIframe({ url, refreshKey = 0 }: SandboxIframeProps) {
  return (
    <iframe
      key={refreshKey}
      src={url}
      className="w-full h-full border-0 bg-white"
      title="Preview"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
    />
  );
}
