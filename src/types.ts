export type TreeNode = FolderNode | BookmarkNode;

export interface FolderNode {
  type: 'folder';
  id: string;
  name: string;
  children: TreeNode[];
  expanded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkNode {
  type: 'bookmark';
  id: string;
  label?: string;
  filePath: string;
  numbers: Record<number, number>;
  createdAt: string;
  updatedAt: string;
}

export interface FilemarkState {
  version: string;
  items: TreeNode[];
}

export function isFolderNode(node: TreeNode): node is FolderNode {
  return node.type === 'folder';
}

export function isBookmarkNode(node: TreeNode): node is BookmarkNode {
  return node.type === 'bookmark';
}
