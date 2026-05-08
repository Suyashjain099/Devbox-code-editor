import { useState, useRef, useEffect } from 'react';
import { FaJs, FaPython, FaRust, FaJava, FaFileCode, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { SiCplusplus, SiC, SiTypescript, SiGo } from 'react-icons/si';
import { DiHtml5, DiCss3 } from 'react-icons/di';
import { MdFolder, MdFolderOpen } from 'react-icons/md';
import socket from '../socket';

// ─────────────────────────────────────────────
// File Icon Resolver
// ─────────────────────────────────────────────
const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  const size = 16;
  switch (extension) {
    case 'js': case 'jsx': return <FaJs color="#f7df1e" size={size} />;
    case 'ts': case 'tsx': return <SiTypescript color="#007acc" size={size} />;
    case 'py':   return <FaPython color="#3776ab" size={size} />;
    case 'cpp': case 'cxx': return <SiCplusplus color="#00599c" size={size} />;
    case 'c':    return <SiC color="#00599c" size={size} />;
    case 'java': return <FaJava color="#007396" size={size} />;
    case 'go':   return <SiGo color="#00add8" size={size} />;
    case 'rs':   return <FaRust color="#dea584" size={size} />;
    case 'html': return <DiHtml5 color="#e34c26" size={size} />;
    case 'css':  return <DiCss3 color="#1572b6" size={size} />;
    default:     return <FaFileCode color="#9CA3AF" size={size} />;
  }
};

// ─────────────────────────────────────────────
// Context Menu Component
// ─────────────────────────────────────────────
const ContextMenu = ({ x, y, onClose, items }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: y, left: x }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="context-menu-item"
          onClick={() => { item.action(); onClose(); }}
        >
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          <span>{item.label}</span>
          {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// File Tree Node (Recursive)
// ─────────────────────────────────────────────
const FileTreeNode = ({ fileName, nodes, onSelect, path, selectedFile, depth = 0 }) => {
  const isDir = !!nodes;
  const [isOpen, setIsOpen] = useState(depth < 1); // Auto-expand first level
  const [contextMenu, setContextMenu] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(fileName);
  const renameInputRef = useRef(null);

  const isSelected = !isDir && path === selectedFile;

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isDir) {
      setIsOpen(!isOpen);
    } else {
      onSelect(path);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = () => {
    const type = isDir ? 'folder' : 'file';
    if (window.confirm(`Delete ${type} "${fileName}"?`)) {
      socket.emit('file:delete', { path });
    }
  };

  const handleRename = () => {
    setIsRenaming(true);
    setRenameValue(fileName);
  };

  const submitRename = () => {
    if (renameValue && renameValue !== fileName) {
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      const newPath = parentPath ? `${parentPath}/${renameValue}` : renameValue;
      socket.emit('file:rename', { oldPath: path, newPath });
    }
    setIsRenaming(false);
  };

  const handleNewFileInside = () => {
    const name = prompt("Enter file name:");
    if (!name) return;
    const newPath = path ? `${path}/${name}` : name;
    socket.emit('file:create', { path: newPath });
    setIsOpen(true);
  };

  const handleNewFolderInside = () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    const newPath = path ? `${path}/${name}` : name;
    socket.emit('folder:create', { path: newPath });
    setIsOpen(true);
  };

  const contextMenuItems = isDir ? [
    { label: 'New File', action: handleNewFileInside, shortcut: '' },
    { label: 'New Folder', action: handleNewFolderInside, shortcut: '' },
    { label: 'Rename', action: handleRename, shortcut: 'F2' },
    { label: 'Delete', action: handleDelete, shortcut: 'Del' },
  ] : [
    { label: 'Rename', action: handleRename, shortcut: 'F2' },
    { label: 'Delete', action: handleDelete, shortcut: 'Del' },
  ];

  return (
    <div style={{ paddingLeft: depth > 0 ? '12px' : '0' }}>
      <div
        className={`tree-node ${isSelected ? 'tree-node-selected' : ''} ${isDir ? 'tree-node-dir' : ''}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {isDir && (
          <span className="tree-chevron">
            {isOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
          </span>
        )}
        <span className="tree-icon">
          {isDir
            ? (isOpen ? <MdFolderOpen color="#6366F1" size={18} /> : <MdFolder color="#6366F1" size={18} />)
            : getFileIcon(fileName)
          }
        </span>
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-label">{fileName}</span>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={contextMenuItems}
        />
      )}

      {isDir && isOpen && nodes && (
        <div className="tree-children">
          {Object.keys(nodes).map((child) => (
            <FileTreeNode
              key={child}
              onSelect={onSelect}
              path={path ? `${path}/${child}` : child}
              fileName={child}
              nodes={nodes[child]}
              selectedFile={selectedFile}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// File Tree Root
// ─────────────────────────────────────────────
const FileTree = ({ tree, onSelect, selectedFile }) => {
  return (
    <div className="tree">
      {Object.keys(tree).map((child) => (
        <FileTreeNode
          key={child}
          onSelect={onSelect}
          path={child}
          fileName={child}
          nodes={tree[child]}
          selectedFile={selectedFile}
          depth={0}
        />
      ))}
    </div>
  );
};

export default FileTree;