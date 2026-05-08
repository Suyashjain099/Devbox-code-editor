import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useEffect, useRef } from "react";
import socket from "../socket";

const urlParams = new URLSearchParams(window.location.search);
const project = urlParams.get("project") || "";
const userId = urlParams.get("userId") || "";

import "@xterm/xterm/css/xterm.css";

const Terminal = () => {
  const terminalRef = useRef(null);
  const termInstance = useRef(null);
  const fitAddonRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: "#0D1117",
        foreground: "#E6EDF3",
        cursor: "#6366F1",
        selectionBackground: "rgba(99, 102, 241, 0.3)",
        black: "#1E2532",
        red: "#FF6B6B",
        green: "#5EEAD4",
        yellow: "#FCD34D",
        blue: "#6366F1",
        magenta: "#A78BFA",
        cyan: "#22D3EE",
        white: "#E6EDF3",
        brightBlack: "#475569",
        brightRed: "#FCA5A5",
        brightGreen: "#86EFAC",
        brightYellow: "#FDE68A",
        brightBlue: "#818CF8",
        brightMagenta: "#C4B5FD",
        brightCyan: "#67E8F9",
        brightWhite: "#FFFFFF",
      },
      allowTransparency: false,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    termInstance.current = term;
    fitAddonRef.current = fitAddon;

    // Fit after a short delay to ensure the container has dimensions
    const fitTimer = setTimeout(() => {
      try {
        fitAddon.fit();
        socket.emit("terminal:resize", { cols: term.cols, rows: term.rows });
      } catch (e) {
        // container might not have dimensions yet
      }
    }, 300);

    // User types → send to backend PTY
    const onData = (data) => {
      socket.emit("terminal:write", data, project, userId);
    };
    const disposable = term.onData(onData);

    // Backend PTY output → write to terminal display
    const onTerminalData = (data) => {
      console.log('[Terminal Receive]', data);
      term.write(data);
    };
    socket.on("terminal:data", onTerminalData);

    // When socket reconnects, the server will send a fresh prompt
    const onConnect = () => {
      socket.emit("terminal:write", "cd_project", project, userId);
    };
    socket.on("connect", onConnect);
    
    // Also emit immediately in case it's already connected
    if (socket.connected) {
      socket.emit("terminal:write", "cd_project", project, userId);
    }

    // ResizeObserver for auto-fit when container resizes
    let resizeObserver = null;
    if (terminalRef.current) {
      resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
          socket.emit("terminal:resize", { cols: term.cols, rows: term.rows });
        } catch (e) {
          // ignore fit errors
        }
      });
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      clearTimeout(fitTimer);
      socket.off("terminal:data", onTerminalData);
      socket.off("connect", onConnect);
      if (resizeObserver) resizeObserver.disconnect();
      disposable.dispose();
      term.dispose();
    };
  }, []);

  return (
    <div
      ref={terminalRef}
      id="terminal"
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default Terminal;
