import React, { useState, useEffect } from 'react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ExpandMore, ChevronRight } from '@mui/icons-material';
import { Checkbox, Typography } from '@mui/material';

interface ProjectFileListProps {
  files: string[];
  selectedFiles: string[];
  onSelectionChange: (selectedFiles: string[]) => void;
}

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

export const ProjectFileList: React.FC<ProjectFileListProps> = ({
  files,
  selectedFiles,
  onSelectionChange,
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    const tree = buildFileTree(files);
    setTreeData(tree);
  }, [files]);

  const buildFileTree = (files: string[]): TreeNode[] => {
    const root: TreeNode = { id: 'root', name: 'root', children: [] };
    files.forEach(file => {
      const parts = file.split('/');
      let currentNode = root;
      parts.forEach((part, index) => {
        let child = currentNode.children?.find(c => c.name === part);
        if (!child) {
          child = { id: parts.slice(0, index + 1).join('/'), name: part };
          if (index < parts.length - 1) {
            child.children = [];
          }
          currentNode.children = currentNode.children || [];
          currentNode.children.push(child);
        }
        currentNode = child;
      });
    });
    return root.children || [];
  };

  const handleToggle = (event: React.SyntheticEvent, itemIds: string[]) => {
    setExpanded(itemIds);
  };

  const handleSelect = (node: TreeNode) => {
    let newSelected: string[];
    if (node.children) {
      // If it's a directory, toggle all child files
      const allChildFiles = getAllChildFiles(node);
      if (allChildFiles.every(file => selectedFiles.includes(file))) {
        newSelected = selectedFiles.filter(file => !allChildFiles.includes(file));
      } else {
        newSelected = [...new Set([...selectedFiles, ...allChildFiles])];
      }
    } else {
      // If it's a file, toggle its selection
      newSelected = selectedFiles.includes(node.id)
        ? selectedFiles.filter(file => file !== node.id)
        : [...selectedFiles, node.id];
    }
    onSelectionChange(newSelected);
  };

  const getAllChildFiles = (node: TreeNode): string[] => {
    if (!node.children) return [node.id];
    return node.children.flatMap(getAllChildFiles);
  };

  const renderTree = (node: TreeNode) => (
    <TreeItem
      key={node.id}
      itemId={node.id}
      label={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Checkbox
            checked={node.children
              ? getAllChildFiles(node).every(file => selectedFiles.includes(file))
              : selectedFiles.includes(node.id)
            }
            onChange={() => handleSelect(node)}
            onClick={e => e.stopPropagation()}
          />
          <Typography>{node.name}</Typography>
        </div>
      }
    >
      {Array.isArray(node.children)
        ? node.children.map((child) => renderTree(child))
        : null}
    </TreeItem>
  );

  return (
    <div style={{
      maxHeight: '400px',
      overflowY: 'auto',
      padding: '16px',
      borderBottom: '1px solid var(--vscode-panel-border)',
    }}>
      <h3 style={{ margin: '0 0 8px 0' }}>Project Files</h3>
      <SimpleTreeView
        aria-label="project file tree"
        slots={{
          expandIcon: ChevronRight,
          collapseIcon: ExpandMore
        }}
        expandedItems={expanded}
        onExpandedItemsChange={handleToggle}
      >
        {treeData.map(renderTree)}
      </SimpleTreeView>
    </div>
  );
};
