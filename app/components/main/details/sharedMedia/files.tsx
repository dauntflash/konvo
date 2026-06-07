import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import pb from "@/lib/pocketbase";

type MessageRecord = any;

function Files({ activeUser }: { activeUser: any }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<MessageRecord[]>([]);

  const fmtSize = (b: number) => {
    const u = ["B", "KB", "MB", "GB"],
      i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / 1024 ** i).toFixed(1)} ${u[i]}`;
  };

  const fetchFiles = async (): Promise<MessageRecord[]> => {
    if (!user?.id || !activeUser?.id) return [];

    try {
      const records = await pb.collection("messages").getFullList({
        filter: `(sender = "${user.id}" && receiver = "${activeUser.id}") || (sender = "${activeUser.id}" && receiver = "${user.id}")`,
        sort: "created",
        expand: "sender,receiver",
      });

      const fileMessages = records.filter((m: any) => m.file);

      for (const m of fileMessages) {
        if (m.file && !m.fileSize) {
          try {
            const h = await fetch(pb.files.getURL(m, m.file), { method: "HEAD" });
            const len = h.headers.get("content-length");
            if (len) m.fileSize = fmtSize(+len);
          } catch (error) {
            console.error("Failed to get file size:", error);
          }
        }
      }

      return fileMessages;
    } catch (error) {
      console.error("Error fetching files:", error);
      return [];
    }
  };

  useEffect(() => {
    if (!user?.id || !activeUser?.id) {
      setFiles([]);
      return;
    }

    fetchFiles().then(setFiles);
  }, [user?.id, activeUser?.id]);

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    fetch(fileUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => console.error("Download failed:", err));
  };

  return (
    <div>
      {files.length === 0 && <p className="text-sm text-gray-500 w-full">No files shared yet.</p>}
      <div>
        {files.map((file: any, index: number) => (
          <div
            key={file?.id ?? index}
            className="flex items-center bg-[#5182fe] bg-opacity-40 backdrop-blur-md rounded-lg p-2 mt-2 gap-3 w-full">
            {file.fileType?.includes("image/") ? (
              <Image
                src={pb.files.getURL(file, file.file)}
                width={30}
                height={30}
                alt={file.fileName || "file"}
                className="inline-block mr-2 rounded-md"
              />
            ) : file.fileType?.includes("video/") ? (
              <div className="">
                <span className="bi bi-filetype-mp4 text-4xl"></span>
              </div>
            ) : (
              <div className="">
                <div className="">
                  {file.fileType?.includes("doc") ? (
                    <div className="bi bi-file-earmark-word text-4xl" />
                  ) : file.fileType?.includes("pdf") ? (
                    <div className="bi bi-file-earmark-pdf text-4xl" />
                  ) : file.fileType?.includes("xls") || file.fileType?.includes("spreadsheet") ? (
                    <div className="bi bi-file-earmark-excel text-4xl" />
                  ) : file.fileType?.includes("ppt") ? (
                    <div className="bi bi-file-earmark-ppt text-4xl" />
                  ) : (
                    <div className="bi bi-file-earmark text-4xl" />
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 w-[70%]">
              <span className="text-sm block font-medium max-w-[250px] truncate">{file.fileName || "Unnamed file"}</span>
              <span className="text-xs opacity-80 block">{file.fileSize || "Calculating..."}</span>
            </div>

            <button
              onClick={() => handleDownloadFile(pb.files.getURL(file, file.file), file.fileName)}
              className="hover:opacity-80 transition"
              title="Download">
              <span className="bi bi-download"></span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Files;
