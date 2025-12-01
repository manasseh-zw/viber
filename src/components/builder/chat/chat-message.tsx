import { cn } from "@/lib/utils";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { RobotIcon } from "@phosphor-icons/react/dist/csr/Robot";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  files?: Array<{ path: string; status: "pending" | "applied" | "error" }>;
  packages?: string[];
}

interface ChatMessageProps {
  message: ChatMessageData;
  showAvatar?: boolean;
}

export function ChatMessage({ message, showAvatar = false }: ChatMessageProps) {
  const { role, content } = message;

  return (
    <div
      className={cn(
        "animate-fade-up",
        role === "user" && "flex justify-end",
        role !== "user" && "flex justify-start"
      )}
    >
      <div
        className={cn(
          "flex gap-3 max-w-[90%]",
          role === "user" && "flex-row-reverse"
        )}
      >
        {showAvatar && (
          <div
            className={cn(
              "shrink-0 size-8 rounded-full flex items-center justify-center",
              role === "user" && "bg-primary text-primary-foreground",
              role === "assistant" &&
                "bg-sidebar-accent text-sidebar-accent-foreground",
              role === "system" && "bg-muted text-muted-foreground"
            )}
          >
            {role === "user" && <UserIcon weight="fill" className="size-4" />}
            {role === "assistant" && (
              <RobotIcon weight="fill" className="size-4" />
            )}
            {role === "system" && <InfoIcon weight="fill" className="size-4" />}
          </div>
        )}

        <div
          className={cn(
            "rounded-xl px-4 py-3",
            role === "user" && "bg-primary text-primary-foreground",
            role === "assistant" &&
              "bg-sidebar-accent text-sidebar-accent-foreground",
            role === "system" &&
              "bg-sidebar-accent/50 text-sidebar-foreground/80 text-sm"
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>

          {message.files && message.files.length > 0 && (
            <div className="mt-2 pt-2 border-t border-current/10 space-y-1">
              <p className="text-xs opacity-70 font-medium">Files:</p>
              {message.files.map((file) => (
                <div
                  key={file.path}
                  className="text-xs font-mono flex items-center gap-2"
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      file.status === "applied" && "bg-green-500",
                      file.status === "pending" && "bg-yellow-500",
                      file.status === "error" && "bg-red-500"
                    )}
                  />
                  {file.path}
                </div>
              ))}
            </div>
          )}

          {message.packages && message.packages.length > 0 && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <p className="text-xs opacity-70 font-medium">Packages:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {message.packages.map((pkg) => (
                  <span
                    key={pkg}
                    className="text-xs font-mono bg-current/10 px-1.5 py-0.5 rounded"
                  >
                    {pkg}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
