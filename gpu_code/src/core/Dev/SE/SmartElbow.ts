import * as THREE from "three";
import { ViewModel } from "../../view-model";
import { VoxelNode } from "../Voxel/VoxelNode";
import { Line } from "../../../render/generic/line";
import { PathInfo } from "./PathInfo";
import Vec3 from "../../util/vec3";
import { HostObject } from "../../BIM/HostObject";
import { mainPath } from "../../../components/side-tab-contents/routing-tab-contents/HookUpPhaseOne";
import { VoxelManager } from "../Voxel/VoxelManager";
import { drawPipe, drawPolyline } from "../../api/hookup-routing/render";
import { PipeFitting } from "../../family/PipeFittings";
import { getFittingProperty } from "../../api/hookup-routing/functions";
import { GPU } from "gpu.js";
const gpu = new GPU();

export class SmartElbowManager {
  viewModel: ViewModel;
  voxelManager: VoxelManager;
  sPts: THREE.Vector3[] = [];
  ePts: THREE.Vector3[] = [];
  #voxelNodes: VoxelNode[] = [];
  startNodes: VoxelNode[] = [];
  endNodes: VoxelNode[] = [];
  paths: VoxelNode[][] = [];
  pathPtsGroup: THREE.Vector3[][] = [];
  MEPConnectors: HostObject[] = [];
  connectorProperties: string[] = [];
  colorNode: colorRGB = { r: 1, g: 1, b: 0 };
  colorLink: colorRGB = { r: 1, g: 0, b: 1 };
  pathColors: colorRGB[] = [];
  materialPath: THREE.LineBasicMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
  });
  nodeIndexesAll: number[] = [];
  gScores: number[][] = [];
  hScores: number[][] = [];
  fScores: number[][] = [];
  branchingMainForSE2_2: mainPath[] = [];

  constructor(_viewModel: ViewModel, _voxelManager: VoxelManager) {
    this.viewModel = _viewModel;
    this.voxelManager = _voxelManager;
  }

  get voxelNodes() {
    if (this.#voxelNodes.length > 0) return this.#voxelNodes;
    return this.voxelManager.voxelNodes;
  }

  set voxelNodes(voxels: VoxelNode[]) {
    this.#voxelNodes = voxels;
  }

  get voxelNodesSupport() {
    return this.voxelManager.supportSpaceVoxels;
  }

  run = async (
    _sPts: THREE.Vector3[],
    _ePts: THREE.Vector3[],
    withPenalty?: boolean,
    forValveToEquip = false,
    properties: string[] = [],
    connectors: HostObject[] = []
  ) => {
    if (properties) this.connectorProperties = properties;
    if (connectors) this.MEPConnectors = connectors;
    this.sPts = _sPts;
    this.ePts = _ePts;
    console.log("this.sPts", this.sPts);
    console.log("this.ePts", this.ePts);
    await this.#initialize(forValveToEquip);
    // this.drawNodes();
    // this.drawLink(true);
    // this.drawLink();
    if (withPenalty) await this.#aStarWithPenalty(forValveToEquip);
    else await this.#aStarPathFinding();
    await this.#organizePathPts();
    // this.drawPath();
    // if (withPenalty) this.drawPath();
    return this.paths;
  };

  #findObstacleNodes = (
    endNodes: VoxelNode[],
    voxel1: VoxelNode,
    voxel2?: VoxelNode
  ) => {
    const _obstacleVoxelNodes: VoxelNode[] = [];
    for (const voxel1Neighbor of voxel1.neighbors) {
      if (!voxel1Neighbor.isAvailable && !endNodes.includes(voxel1Neighbor)) {
        _obstacleVoxelNodes.push(voxel1Neighbor);
      }
    }
    if (voxel2) {
      for (const voxel2Neighbor of voxel2.neighbors) {
        if (!voxel2Neighbor.isAvailable && !endNodes.includes(voxel2Neighbor)) {
          _obstacleVoxelNodes.push(voxel2Neighbor);
        }
      }
    }
    return _obstacleVoxelNodes;
  };

  #findObstaclePts = (
    endNodes: VoxelNode[],
    voxel1: VoxelNode,
    voxel2?: VoxelNode
  ) => {
    const _obstaclePts: THREE.Vector3[] = [];
    for (const voxel1Neighbor of voxel1.neighbors) {
      if (!voxel1Neighbor.isAvailable && !endNodes.includes(voxel1Neighbor)) {
        _obstaclePts.push(voxel1Neighbor.location);
      }
    }
    if (voxel2) {
      for (const voxel2Neighbor of voxel2.neighbors) {
        if (!voxel2Neighbor.isAvailable && !endNodes.includes(voxel2Neighbor)) {
          _obstaclePts.push(voxel2Neighbor.location);
        }
      }
    }
    return _obstaclePts;
  };

  #getObstacleRadius = (
    endNodes: VoxelNode[],
    voxel1: VoxelNode,
    voxel2?: VoxelNode
  ) => {
    const obstacleNodes: VoxelNode[] = [];
    for (const voxel1Neighbor of voxel1.neighbors) {
      if (!voxel1Neighbor.isAvailable && !endNodes.includes(voxel1Neighbor)) {
        obstacleNodes.push(voxel1Neighbor);
      }
    }
    if (voxel2) {
      for (const voxel2Neighbor of voxel2.neighbors) {
        if (!voxel2Neighbor.isAvailable && !endNodes.includes(voxel2Neighbor)) {
          obstacleNodes.push(voxel2Neighbor);
        }
      }
    }

    // temporary using z value as radius
    const radiusAll: number[] = [];
    for (const obstacle of obstacleNodes) {
      let size = new THREE.Vector3();
      obstacle.box.getSize(size);
      radiusAll.push(size.z / 2);
    }
    return radiusAll;
  };

  #initialize = async (forValve: boolean = false) => {
    console.log("this.endNodes before init", [...this.endNodes]);
    console.log("this.startNodes before init", [...this.startNodes]);
    // this.endNodes.length = 0;
    // this.startNodes.length = 0;
    // console.log("this.endNodes after init", [...this.endNodes]);
    // console.log("this.startNodes after init", [...this.startNodes]);

    if (this.sPts.length === this.ePts.length) {
      for (const [i, sPt] of this.sPts.entries()) {
        const ePt = this.ePts[i];
        if (!forValve) {
          const insideNodeStart = getInsideNode(sPt, this.voxelNodes);
          if (insideNodeStart) {
            if (
              insideNodeStart.neighbors.filter(
                (neighbor) => neighbor.isAvailable === true
              ).length === 0
            ) {
              const tempNeighbor = getNearestNode(sPt, this.voxelNodes);
              insideNodeStart.tempNeighbor.push(tempNeighbor);
            }
            this.startNodes.push(insideNodeStart);
          }
          if (!insideNodeStart)
            this.startNodes.push(getNearestNode(sPt, this.voxelNodes));
          this.endNodes.push(getNearestNode(ePt, this.voxelNodes));
        }
        // forValve
        else {
          const filterNode = [...this.voxelNodes].filter((node) => {
            return node.box.max.x < sPt.x;
          });

          this.startNodes.push(getNearestNode(sPt, filterNode));
          this.endNodes.push(getNearestNode(ePt, this.voxelNodes));
        }
      }
    } else console.error("the length of sPts is not equal to ePts ");

    this.endNodes.map((endNode) => (endNode.isAvailable = true));
    console.log("this.startNodes", this.startNodes);
    console.log("this.endNodes", this.endNodes);

    // debug show
    // this.voxelManager.showVoxels([...this.startNodes, ...this.endNodes]);
  };

  // aStarPathFinding = (): VoxelNode[][] | undefined => {
  #aStarPathFinding = async () => {
    if (
      this.startNodes.length > 0 &&
      this.endNodes.length > 0 &&
      this.startNodes.length === this.endNodes.length
    ) {
      console.warn("this.startNodes in path finding", this.startNodes);
      console.warn("this.sPts in path finding", this.sPts);
      console.warn("this.endNodes in path finding", this.endNodes);
      console.warn("this.ePts in path finding", this.ePts);
      for (const [index, startNode] of this.startNodes.entries()) {
        // if (i > 0) break; // for test
        const endNode = this.endNodes[index];

        // close support node exclude endNode
        console.log("startNode in path finding", startNode);
        console.log("endNode in path finding", endNode);
        for (const supportNode of this.voxelNodesSupport) {
          // console.log("supportNode", supportNode);
          // FIXME 0521 comment out
          // if (supportNode === startNode || supportNode === endNode) {
          //   supportNode.isAvailable = true;
          //   // console.warn("open end node!!");
          // } else {
          //   // console.warn("close other node!!");
          //   supportNode.isAvailable = false;
          // }
        }

        if (startNode.tempNeighbor.length > 0) {
          console.log(
            "this start node has no neighbor, add tempNeighbor!",
            startNode
          );
          startNode.neighbors.push(...startNode.tempNeighbor);
        }

        this.voxelNodes.map((voxel) => voxel.initializeScore());

        const openSet: VoxelNode[] = []; // Store nodes to be evaluated
        const closedSet: Set<VoxelNode> = new Set(); // storing the evaluated nodes

        // temp open start node and end node
        // console.warn("startNode", startNode);
        // console.warn("endNode", endNode);
        // let recordStart = false;
        // let recordEnd = false;
        // if (!startNode.isAvailable) {
        //   startNode.isAvailable = true;
        //   recordStart = true;
        // }
        // if (!endNode.isAvailable) {
        //   endNode.isAvailable = true;
        //   recordEnd = true;
        // }
        // console.warn("startNode after", startNode);
        // console.warn("endNode after", endNode);

        console.log("path index: ", index);
        console.log("Origin openSet: ", [...openSet]);
        console.log("Origin closedSet: ", [...closedSet]);

        // Initialize The cost of the starting node
        startNode.gCost = 0; // Actual cost from starting point to current node
        startNode.hCost = calculateDistByEuclidean(startNode, endNode); // heuristic cost
        startNode.fCost = startNode.gCost + startNode.hCost; // total cost

        openSet.push(startNode); // Add the starting node to the open list

        // Loop when open list is not empty
        let isPathFind = false;
        let loopCount = 0;
        while (openSet.length > 0) {
          // Sort the open list by fCost and select the node with the smallest fCost as the current node
          openSet.sort((a, b) => (a.fCost || 0) - (b.fCost || 0));

          // Remove and get the first node in the list
          let currentNode = openSet.shift()!;
          // console.log("check point1");
          // console.log("currentNode", currentNode);
          // If the current node is the target node, rebuild and return the path
          if (currentNode.nodeId === endNode.nodeId) {
            const newPath = await this.#reconstructPath(
              currentNode,
              this.voxelNodes
            );
            console.log("newPath", newPath);
            if (newPath) {
              const finalEndNode = getInsideNode(
                this.ePts[index],
                this.voxelNodes
              );
              console.log("finalEndNode", finalEndNode);
              if (finalEndNode) newPath.push(finalEndNode);
              this.paths.push(newPath);

              const thisFScores: number[] = newPath.map((node) => node.fCost);
              this.fScores.push(thisFScores);

              const thisHScores: number[] = newPath.map((node) => node.hCost);
              this.hScores.push(thisHScores);

              const thisGScores: number[] = newPath.map((node) => node.gCost);
              this.gScores.push(thisGScores);
            }
            isPathFind = true;
            break;
          }

          closedSet.add(currentNode); // Add the current node to the shutdown list

          // Traverse all neighbors of the current node
          // console.log("check point2");

          for (const neighbor of currentNode.neighbors) {
            // console.log("check point3", index);

            // Skip if neighbor is already in the shutdown list or is an obstacle
            if (closedSet.has(neighbor) || !neighbor.isAvailable) {
              continue;
            }

            // Calculate tentativeGCost to reach neighbor
            // let tentativeGCost = (currentNode.gCost || 0) + 1; // Assume that the cost per step is 1

            let tentativeGCost =
              (currentNode.gCost || 0) +
              calculateDistByEuclidean(currentNode, neighbor);

            // ---Logic to detect and prevent circular references---
            let cycleDetected = false;
            let potentialParent = currentNode;
            while (potentialParent) {
              if (potentialParent.nodeId === neighbor.nodeId) {
                cycleDetected = true;
                break;
              }
              potentialParent = this.voxelNodes.find(
                (node) => node.nodeId === potentialParent.parent
              )!;
            }
            // ---Logic to detect and prevent circular references---

            // If the neighbor is not in the open list, or a better path is found, update the cost and path of the neighbor node
            if (
              !cycleDetected &&
              (!openSet.includes(neighbor) ||
                tentativeGCost < (neighbor.gCost || Infinity))
            ) {
              neighbor.parent = currentNode.nodeId; // Set the current node as the neighbor's parent node
              neighbor.gCost = tentativeGCost; // Update neighbor’s gCost

              // Recalculate neighbor's hCost
              neighbor.hCost = calculateDistByEuclidean(neighbor, endNode);
              neighbor.fCost = neighbor.gCost + neighbor.hCost; // Update neighbor’s fCost

              // If the neighbor is not in the open list, add it
              if (!openSet.includes(neighbor)) {
                openSet.push(neighbor);
              }
            }
          }
          loopCount++;
        }

        console.log("total loopCount of SE", loopCount);

        if (!isPathFind) {
          // const emptyPath: VoxelNode[] = [];
          // this.paths.push(emptyPath);
          alert(
            `this path is not found! startNode: ${startNode}, endNode: ${endNode}`
          );
          console.error(
            "this path is not found!",
            "startNode",
            startNode,
            "endNode",
            endNode
          );
          this.paths.push([startNode, endNode]);
        }
        console.log("isPathFind", isPathFind);

        if (startNode.tempNeighbor.length > 0) {
          // console.log("before delete", [...startNode.neighbors]);
          // console.log(startNode.tempNeighbor);
          startNode.neighbors = startNode.neighbors.filter(
            (neighbor) => !startNode.tempNeighbor.includes(neighbor)
          );
          // console.log("after delete", [...startNode.neighbors]);
        }

        // close start node and end node
        // if (recordStart) startNode.isAvailable = false;
        // if (recordEnd) endNode.isAvailable = false;
      }
    }
    // If the path is not found at the end of the loop, undefined is returned.
    // const emptyPath: VoxelNode[] = [];
    // this.paths.push(emptyPath);
    return undefined;
  };

  // aStarWithPenalty = (): VoxelNode[][] | undefined => {
  #aStarWithPenalty = async (notBacktrack = false) => {
    console.log("START aStarWithPenalty");
    console.log("this.startNodes", this.startNodes);
    console.log("this.endNodes", this.endNodes);

    if (
      this.startNodes.length > 0 &&
      this.endNodes.length > 0 &&
      this.startNodes.length === this.endNodes.length
    ) {
      for (const sNode of this.startNodes) {
        sNode.isAvailable = false;
      }

      for (const [i, startNode] of this.startNodes.entries()) {
        await this.#aStarCore_Penalty(startNode, i, notBacktrack);
      }
    }
    for (const [i, path] of this.paths.entries()) {
      if (!path) alert(`the path ${i + 1} couldn't generated!, please check`);
    }

    return this.paths.length > 0 ? this.paths : undefined;
  };

  #aStarCore_Penalty = async (
    startNode: VoxelNode,
    i: number,
    notBacktrack = false
  ) => {
    const tempClosedNodes: VoxelNode[] = [];
    if (notBacktrack)
      this.voxelNodes.map((node) => {
        if (
          node.location.x > startNode.location.x &&
          node.isAvailable === true
        ) {
          node.isAvailable = false;
          tempClosedNodes.push(node);
        }
      });
    console.log("aStarCore_Penalty");

    for (const voxelNode of this.voxelNodes) {
      voxelNode.fCost = Number.MAX_SAFE_INTEGER;
      voxelNode.gCost = Number.MAX_SAFE_INTEGER;
      voxelNode.hCost = Number.MAX_SAFE_INTEGER;
    }

    const openSet: VoxelNode[] = [];
    const closedSet: Set<VoxelNode> = new Set();
    const endNode = this.endNodes[i];
    startNode.isAvailable = true;
    endNode.isAvailable = true;

    startNode.gCost = 0;
    startNode.hCost = await calculateDistByManhattan(startNode, endNode);
    startNode.fCost = startNode.gCost + startNode.hCost;

    openSet.push(startNode);

    let isPathFind = false;

    while (openSet.length > 0) {
      openSet.sort((a, b) => (a.fCost || 0) - (b.fCost || 0));
      let currentNode = openSet.shift()!;

      if (currentNode.nodeId === endNode.nodeId) {
        console.log(`startNode index${i}`);
        const newPath = await this.#reconstructPath(
          currentNode,
          this.voxelNodes,
          true
        );
        this.paths.push(newPath);
        newPath.map((node) => (node.isAvailable = false));
        isPathFind = true;
        tempClosedNodes.map((node) => (node.isAvailable = true));
        break;
      }

      closedSet.add(currentNode);

      for (const neighbor of currentNode.neighbors) {
        if (closedSet.has(neighbor) || !neighbor.isAvailable) {
          continue;
        }

        let tentativeGCost =
          (currentNode.gCost || 0) +
          (await calculateDistByManhattan(currentNode, neighbor));

        // Added turn penalty
        if (currentNode.parent) {
          const parentNode = this.voxelNodes.find(
            (node) => node.nodeId === currentNode.parent
          )!;
          if (parentNode) {
            if (!this.#isTurn(parentNode, currentNode, neighbor)) {
              tentativeGCost += 100; // turn penalty
            }
          }
        }

        if (
          !openSet.includes(neighbor) ||
          tentativeGCost < (neighbor.gCost || Infinity)
        ) {
          neighbor.parent = currentNode.nodeId;
          neighbor.gCost = tentativeGCost;
          neighbor.hCost = await calculateDistByManhattan(neighbor, endNode);
          neighbor.fCost = neighbor.gCost + neighbor.hCost;

          if (!openSet.includes(neighbor) && neighbor.isAvailable) {
            openSet.push(neighbor);
          }
        }
      }
    }
    if (!isPathFind) {
      console.log("no path found");
      this.paths.push([]);
      tempClosedNodes.map((node) => (node.isAvailable = true));
    }
  };

  #isTurn(
    parentNode: VoxelNode,
    currentNode: VoxelNode,
    neighborNode: VoxelNode
  ): boolean {
    const dir1 = {
      x: currentNode.location.x - parentNode.location.x,
      y: currentNode.location.y - parentNode.location.y,
      z: currentNode.location.z - parentNode.location.z,
    };
    const dir2 = {
      x: neighborNode.location.x - currentNode.location.x,
      y: neighborNode.location.y - currentNode.location.y,
      z: neighborNode.location.z - currentNode.location.z,
    };
    const magnitude1 = Math.sqrt(dir1.x ** 2 + dir1.y ** 2 + dir1.z ** 2);
    const magnitude2 = Math.sqrt(dir2.x ** 2 + dir2.y ** 2 + dir2.z ** 2);

    // Compute the dot product of two vectors
    const dotProduct = dir1.x * dir2.x + dir1.y * dir2.y + dir1.z * dir2.z;
    // Calculate the cosine of two vectors
    const cosTheta = dotProduct / (magnitude1 * magnitude2);

    // The cosine of 5 degrees is approximately 0.996
    return cosTheta > 0.996;
  }

  async #organizePathPts() {
    const usedPaths = this.paths;
    // Convert the points in the path to a format for use with a BufferGeometry
    console.log("used paths", usedPaths);
    for (const [i, path] of usedPaths.entries()) {
      console.log("i", i);
      console.log("path", path);
      if (path.length > 0) {
        const allPts: THREE.Vector3[] = [];
        allPts.push(this.sPts[i]);
        console.log("this.sPts[i]", this.sPts[i]);
        for (const node of path) allPts.push(node.location);
        allPts.push(this.ePts[i]);
        console.log("this.ePts[i]", this.ePts[i]);

        console.log("allPts", allPts);
        if (!this.pathPtsGroup.includes(allPts)) this.pathPtsGroup.push(allPts);
      }
    }
    console.log("this.pathPtsGroup after organizePathPts", this.pathPtsGroup);
  }

  #reconstructPath = async (
    currentNode: VoxelNode,
    Nodes: VoxelNode[],
    notReUse?: boolean
  ): Promise<VoxelNode[]> => {
    const path: VoxelNode[] = []; // Initialize path array
    let tempNode: VoxelNode | undefined = currentNode; // Trace back from the end point
    // console.log("reconstructing, tempNode:", tempNode);
    // console.log("reconstructing, tempNode.parent:", tempNode.parent);
    // console.log("reconstructing, tempNode gCost:", tempNode.gCost);

    while (
      tempNode !== undefined &&
      tempNode.parent !== undefined &&
      tempNode.gCost !== 0
    ) {
      if (notReUse) tempNode.isAvailable = false;
      // console.log("tempNode", tempNode);
      // console.log("tempNode.parent", tempNode.parent);
      path.unshift(tempNode); // Add the current node to the beginning of the path
      // tempNode = Nodes[tempNode.parent]; // Trace forward through the parent attribute
      tempNode = Nodes.find((node) => node.nodeId === tempNode!.parent);

      // console.log("parentNode", tempNode);
      if (!tempNode) console.error("can not find parent!");

      // if (notReUse && tempNode!.gCost === 0) tempNode!.isAvailable = false;
    }

    // console.log("this.startNodes", this.startNodes);
    console.log("find the path!");
    return path;
  };

  addConnector = async (_connectors: HostObject[]) => {
    console.log("_connectors", _connectors);
    this.MEPConnectors = _connectors;
    for (const [index, connector] of _connectors.entries()) {
      console.log("index", index);
      console.log("connector", connector);
      const property = getFittingProperty(connector as PipeFitting);
      this.connectorProperties.push(property);
      // if ("Type" in connector.meta) {
      //   const property = String(connector.meta["Type"]);
      //   this.connectorProperties.push(property);
      // }
    }
  };

  getInfoForGE = () => {
    const pathsInfoAll: PathInfo[] = [];

    // temp cull
    const newPaths: VoxelNode[][] = [];
    for (const path of this.paths) {
      if (path.length > 0) newPaths.push(path);
      else console.error("there are invalid path!");
    }
    this.paths = newPaths;
    // temp cull

    for (const [i, path] of this.paths.entries()) {
      // const gScoreRecord = this.gScores[i];
      // const hScoreRecord = this.hScores[i];
      // const fScoreRecord = this.fScores[i];

      if (path.length > 0) {
        // const obstacles: THREE.Vector3[] = [];
        const nodes: THREE.Vector3[] = [];
        // const Radiuses: number[] = [];
        const newPathInfo = new PathInfo(this.sPts[i], this.ePts[i]);

        const endNodes = [
          getInsideNode(this.sPts[i], this.voxelNodes),
          getInsideNode(this.ePts[i], this.voxelNodes),
        ];

        // console.log("endNodes", endNodes);
        for (const [index, pathNode] of path.entries()) {
          // pathNode.gCost = gScoreRecord[index];
          // pathNode.hCost = hScoreRecord[index];
          // pathNode.fCost = fScoreRecord[index];
          newPathInfo.voxelNodes.push(pathNode);
          nodes.push(pathNode.location);
          if (index < path.length - 2) {
            newPathInfo.pathPts.push(pathNode.location);
            // console.log("this node will be ignored", pathNode);
          }

          const obstaclePts = this.#findObstaclePts(endNodes, pathNode);
          // obstacles.push(...obstaclePts);
          // newPath.obstaclePts.push(...this.findObstaclePts(endNodes, pathNode));
          const RadiusNumbers = this.#getObstacleRadius(endNodes, pathNode);
          const obstacleNodes = this.#findObstacleNodes(endNodes, pathNode);
          // Radiuses.push(...RadiusNumbers);

          for (const [i, pt] of obstaclePts.entries()) {
            let isDuplicated = false;
            for (const existingPt of newPathInfo.obstaclePts) {
              if (pt.distanceTo(existingPt) == 0) {
                isDuplicated = true;
              }
            }
            if (!isDuplicated) {
              newPathInfo.obstaclePts.push(pt);
              newPathInfo.obstaclesRadius.push(RadiusNumbers[i]);
              newPathInfo.obstacleVoxel.push(obstacleNodes[i]);
            }
          }
        }

        newPathInfo.property = this.connectorProperties[i];
        newPathInfo.connector = this.MEPConnectors[i];

        pathsInfoAll.push(newPathInfo);
        // console.log("obstacles", obstacles);
        // console.log("Radiuses", Radiuses);
      }
    }
    return pathsInfoAll;
  };

  getMainPathSize(originConnectors: PipeFitting[]) {
    // console.log("this.branchingMainForSE2_2", this.branchingMainForSE2_2);
    // console.log("originConnectors", originConnectors);

    const sizeArray = [];
    const meteDataAll: object[] = [];
    // 1. pair connector
    for (const mainInfo of this.branchingMainForSE2_2) {
      for (const connector of originConnectors) {
        if ("Type" in connector.meta && "Size" in connector.meta) {
          const property = String(connector.meta["Type"]);
          const size = String(connector.meta["Size"]);
          if (property === mainInfo.property) {
            console.log("property", property);
            sizeArray.push(size);
            meteDataAll.push(connector.meta);
            mainInfo.mainSize = parseFloat(size);
            break;
          }
        }
      }
    }
  }

  exportFinalPathBranch(): [THREE.Vector3[][], any[], number, object[]] {
    const paths = this.pathPtsGroup;
    const radiusAll: any[] = this.paths.map(() => "15 mm");
    const meteDataAll = this.paths.map((_, i) => this.MEPConnectors[i].meta); // TODO hot fix
    return [paths, radiusAll, 2, meteDataAll];
  }

  exportFinalPathMain(
    originConnectors: PipeFitting[]
  ): [THREE.Vector3[][], any[], number, object[]] {
    // console.log("this.branchingMainForSE2_2", this.branchingMainForSE2_2);
    // console.log("originConnectors", originConnectors);

    const sizeArray = [];
    const meteDataAll: object[] = [];
    // 1. pair connector
    for (const mainInfo of this.branchingMainForSE2_2) {
      for (const connector of originConnectors) {
        // old method
        // if ("Type" in connector.meta && "Size" in connector.meta) {
        //   const property = String(connector.meta["Type"]);
        //   const size = String(connector.meta["Size"]);
        //   if (property === mainInfo.property) {
        //     console.log("property", property);
        //     sizeArray.push(size);
        //     meteDataAll.push(connector.meta);
        //     break;
        //   }
        // }
        if ("S5_Utility" in connector.meta && "Size" in connector.meta) {
          const property = getFittingProperty(connector);
          const size = String(connector.meta["Size"]);
          if (property === mainInfo.property) {
            console.log("property", property);
            sizeArray.push(size);
            meteDataAll.push(connector.meta);
            break;
          }
        }
      }
    }
    const paths = this.branchingMainForSE2_2.map((info) => info.path);

    const finalPathInfo = [paths, sizeArray, 2, meteDataAll];
    console.log("finalPathInfo", finalPathInfo);

    return [paths, sizeArray, 2, meteDataAll];
  }

  drawNodes = () => {
    const allNodesPt: THREE.Vector3[] = [];

    allNodesPt.push(...this.sPts);
    for (const node of this.voxelNodes) allNodesPt.push(node.location);
    allNodesPt.push(...this.ePts);

    for (const nodePt of allNodesPt) {
      // new Point(nodePt.x, nodePt.y, nodePt.z, this.colorNode);
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([nodePt.x, nodePt.y, nodePt.z]);

      // itemSize = 3 because there are 3 values (components) per vertex
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      geometry.setAttribute(
        "size",
        new THREE.BufferAttribute(new Float32Array([5]), 1)
      );
      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(
          new Float32Array([
            this.colorNode.r,
            this.colorNode.g,
            this.colorNode.b,
          ]),
          3
        )
      );

      const vertexShader = `
    attribute vec3 instancePosition;
    attribute float size;
    varying vec3 vColor;
      void main() {
        vec3 newPosition = position + instancePosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size;
      vColor = color;
      }
    `;

      const fragmentShader = `
    varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `;

      const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
          size: { value: 5 },
        },
        vertexColors: true,
      });

      const object3d = new THREE.Points(geometry, material);

      this.nodeIndexesAll.push(this.viewModel.scene.children.length);
      this.viewModel.scene.children.push(object3d);
    }
  };

  drawLink = (considerIsAvailable?: boolean) => {
    // Traverse all space nodes
    this.voxelNodes.forEach((voxelNode) => {
      // Traverse all neighbors of the current node
      voxelNode.neighborsId.forEach((neighborIndex) => {
        let neighbor = this.voxelNodes.find((s) => s.nodeId === neighborIndex);

        let condition = neighbor !== undefined;
        if (considerIsAvailable) {
          condition =
            neighbor !== undefined &&
            neighbor.isAvailable &&
            voxelNode.isAvailable;
        }

        if (condition && neighbor) {
          // Create geometry and set start and end points of line segments
          new Line(
            [
              new Vec3(
                voxelNode.location.x,
                voxelNode.location.y,
                voxelNode.location.z
              ),
              new Vec3(
                neighbor.location.x,
                neighbor.location.y,
                neighbor.location.z
              ),
            ],
            this.colorLink
          );
        }
      });
    });
  };

  drawPath = (_color?: number) => {
    console.log("this", this);
    console.log("this.paths", this.paths);
    console.log("_color", _color);

    console.warn("this.pathPts", this.pathPtsGroup);
    // Convert the points in the path to a format for use with a BufferGeometry
    // console.log("used paths", usedPaths);
    for (const [_, path] of this.pathPtsGroup.entries()) {
      //#region old method
      // // Create geometry
      // let geometryPath = new THREE.BufferGeometry();
      // console.log("i", i);
      // console.log("path", path);
      // if (path.length > 0) {
      //   // const allPts: THREE.Vector3[] = [];
      //   // allPts.push(this.sPts[i]);
      //   console.log("this.sPts[i]", this.sPts[i]);
      //   // for (const node of path) allPts.push(node.location);
      //   // allPts.push(this.ePts[i]);
      //   console.log("this.ePts[i]", this.ePts[i]);
      //   console.log("allPts", path);
      //   // Each vertex has three coordinate values ​​x, y, z
      //   let vertices = new Float32Array(path.length * 3);
      //   path.forEach((pt, i) => {
      //     vertices[i * 3] = pt.x;
      //     vertices[i * 3 + 1] = pt.y;
      //     vertices[i * 3 + 2] = pt.z;
      //   });
      //   // Add vertex data to geometry
      //   geometryPath.setAttribute(
      //     "position",
      //     new THREE.BufferAttribute(vertices, 3)
      //   );
      //   // Create a polyline object
      //   let line = new THREE.Line(geometryPath, usedColor);
      //   // Add polyline to the scene
      //   // this.nodeIndexes.push(this.viewModel.scene.children.length);
      //   this.viewModel.scene.children.push(line);
      // } else console.error("there's unsolved path.");
      //#endregion
      if (path.length > 0) drawPolyline(path, _color!);
      else console.error("there's unsolved path.");
    }
  };

  drawBranchPipe = (fitting: number, radius: number) => {
    console.warn("draw pipe launch!");
    console.log("this", this);

    console.warn("this.pathPts", this.pathPtsGroup);
    // Convert the points in the path to a format for use with a BufferGeometry
    // console.log("used paths", usedPaths);
    for (const [i, path] of this.pathPtsGroup.entries()) {
      if (path) {
        console.log("draw line, index: ", i);
        drawPipe(path, fitting, radius);
      }
      // Create geometry
      else console.error("there's unsolved path.");
    }
  };
}





function getNearestNode(pt: THREE.Vector3, Nodes: VoxelNode[]) {
  let distance = Infinity;
  let nearestNode: VoxelNode;
  for (const node of Nodes) {
    //const thisDist = node.box.distanceToPoint(pt);
    const thisDist = distanceBetweenBBoxAndPoint3DKernel(pt.x, pt.y, pt.z, node.box.max.x, node.box.min.x, node.box.max.y, node.box.min.y, node.box.max.z, node.box.min.z)[0];
    if (thisDist < distance && node.isAvailable) {
      distance = thisDist;
      nearestNode = node;
    }
  }
  return nearestNode!;
}

function getInsideNode(pt: THREE.Vector3, Nodes: VoxelNode[]) {
  let insideNode: VoxelNode;
  for (const node of Nodes) {
    const isInside = isIntersectingBox3AndPt(pt, node.box);
    if (isInside) {
      insideNode = node;
    }
  }
  return insideNode!;
}

function isIntersectingBox3AndPt(pt: THREE.Vector3, box: THREE.Box3) {
  // Check whether the maximum value of box1 on all axes is less than the minimum value of box2 on the corresponding axis
  // Or whether the minimum value of box1 on all axes is greater than the maximum value of box2 on the corresponding axis
  // If any condition is met, the two boxes do not intersect

  //return isIntersectingBox3Kernel(pt.x,pt.y,pt.z, box.max.x, box.min.x, box.max.y, box.min.y, box.max.z, box.min.z) ? true : false;

  return (
    pt.x >= box.min.x &&
    pt.x <= box.max.x &&
    pt.y >= box.min.y &&
    pt.y <= box.max.y &&
    pt.z >= box.min.z &&
    pt.z <= box.max.z
  );
}


const distanceBetweenBBoxAndPoint3DKernel = gpu.createKernel(function (
  pt_x: number, 
  pt_y: number, 
  pt_z: number, 
  box_max_x: number, 
  box_min_x: number, 
  box_max_y: number, 
  box_min_y: number, 
  box_max_z: number, 
  box_min_z: number 


) {  // 점이 바운딩 박스 내부에 있는 경우
  // if (box_min_x <= pt_x && pt_x <= box_max_x && box_min_y <= pt_y && pt_y <= box_max_y && box_min_z <= pt_z && pt_z <= box_max_z) {
  //   return 0;
  // }

  // 점이 바운딩 박스 외부에 있는 경우
  const dx = Math.max(box_min_x - pt_x, pt_x - box_max_x);
  const dy = Math.max(box_min_y - pt_y, pt_y - box_max_y);
  const dz = Math.max(box_min_z - pt_z, pt_z - box_max_z);
  
  // 유클리드 거리
  return Math.sqrt(dx * dx + dy * dy + dz * dz);

}, {
  output: [1]
});


const isIntersectingBox3Kernel = gpu.createKernel(function(
  pt_x: number, 
  pt_y: number, 
  pt_z: number, 
  box_max_x: number, 
  box_min_x: number, 
  box_max_y: number, 
  box_min_y: number, 
  box_max_z: number, 
  box_min_z: number ) {

  if(
      pt_x >= box_min_x &&
      pt_x <= box_max_x &&
      pt_y >= box_min_y &&
      pt_y <= box_max_y &&
      pt_z >= box_min_z &&
      pt_z <= box_max_z
    )
    {
      return 1;
    }
    else
      return 0;
  
}, {
  output: [1]
});



export async function calculateDistByManhattan(
  currentNode: VoxelNode,
  endNode: VoxelNode
): Promise<number> {
  // // Return the Manhattan distance from currentSpace to endSpace
  return (
    Math.abs(currentNode.location.x - endNode.location.x) +
    Math.abs(currentNode.location.y - endNode.location.y) +
    Math.abs(currentNode.location.z - endNode.location.z)
  );
}

const calculateDistByEuclideanKernel = gpu.createKernel(function(c_x: number, c_y: number, c_z: number, e_x: number, e_y: number, e_z: number) {
  return Math.sqrt(Math.pow(c_x-e_x,2) + Math.pow(c_y-e_y,2) + Math.pow(c_z-e_z,2));
}).setOutput([1]);

export function calculateDistByEuclidean(
  currentNode: VoxelNode,
  endNode: VoxelNode
): number {
  // Return the Euclidean distance from currentNode to endNode

  return calculateDistByEuclideanKernel(currentNode.location.x, currentNode.location.y, currentNode.location.z,
    endNode.location.x, endNode.location.y, endNode.location.x)[0];

  // return Math.sqrt(
  //    Math.pow(currentNode.location.x - endNode.location.x, 2) +
  //     Math.pow(currentNode.location.y - endNode.location.y, 2) +
  //     Math.pow(currentNode.location.z - endNode.location.z, 2)
  // );
}





export function rgbToHex(rgb: colorRGB) {
  let r = Math.round(rgb.r * 255);
  let g = Math.round(rgb.g * 255);
  let b = Math.round(rgb.b * 255);

  const strR = r.toString(16).padStart(2, "0");
  const strG = g.toString(16).padStart(2, "0");
  const strB = b.toString(16).padStart(2, "0");

  return `0x${strR}${strG}${strB}`;
}
export interface colorRGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRGB(hex: number): colorRGB {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;

  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
  };
}

export function getRandomColor(): colorRGB {
  return {
    r: Math.random(),
    g: Math.random(),
    b: Math.random(),
  };
}

export function areCollinear(
  lastPt: THREE.Vector3,
  thisPt: THREE.Vector3,
  nextPt: THREE.Vector3
): boolean {
  const dir1 = new THREE.Vector3(
    thisPt.x - lastPt.x,
    thisPt.y - lastPt.y,
    thisPt.z - lastPt.z
  );
  dir1.normalize();
  const dir2 = new THREE.Vector3(
    nextPt.x - thisPt.x,
    nextPt.y - thisPt.y,
    nextPt.z - thisPt.z
  );
  dir2.normalize();

  const bool =
    dir1.x.toFixed(3) === dir2.x.toFixed(3) &&
    dir1.y.toFixed(3) === dir2.y.toFixed(3) &&
    dir1.z.toFixed(3) === dir2.z.toFixed(3);

  return bool;
}

export function hideObjInScene(viewModel: ViewModel, Indexes: number[]) {
  Indexes.sort((a, b) => b - a);
  for (const index of Indexes) {
    viewModel.scene.children.splice(index, 1);
  }
}
