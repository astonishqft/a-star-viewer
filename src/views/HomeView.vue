<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as zrender from 'zrender'
import type { ZRenderType } from 'zrender'
import { ElButton } from 'element-plus'
import BackgroundCard from '@/components/BackgroundCard.vue'

const { Group, init, Rect, Text } = zrender

const aStar = ref<AStar | null>(null)
const isFinished = ref(false)
const isTestMode = ref(false)

interface IGrid {
  row: number
  column: number
  width: number
  startNode: number[]
  endNode: number[]
}

const fillColorConfig: { [key: string]: { fill: string; desc: string }} = {
  gridColor: {
    fill: '#fff',
    desc: '网格'
  },
  barrierColor: {
    fill: '#130202',
    desc: '障碍物' 
  },
  startColor: {
    fill: '#0f0',
    desc: '起点'
  },
  endColor: {
    fill: '#fa5252',
    desc: '终点'
  },
  calcFValueColor: {
    fill: '#ff0', 
    desc: '参与F值计算的网格'
  },
  pathColor: {
    fill: '#9775fa',
    desc: 'A*算法得到的搜索路径' 
  },
  minFValueColor: {
    fill: '#4dabf7',
    desc: '当前一轮F值计算值最小的网格'
  }
}

class Grid extends Group {
  width: number
  height: number
  row: number
  column: number
  startNode: number[]
  endNode: number[]
  gridType: string = 'grid'
  gId: string
  parentGrid?: Grid
  fNum?: number // F 估值 F = G + H
  gNum?: number // G 估值
  hNum?: number // H 估值
  grid: zrender.Element & { setStyle: Function} | null = null
  fText?: zrender.Element & { setStyle: Function} 
  gText?: zrender.Element
  hText?: zrender.Element

  constructor({ row, column, width, startNode, endNode }: IGrid) {
    super()
    this.setPosition([column * width, row * width])
    this.row = row
    this.column = column
    this.gId = `${this.row}_${this.column}`
    this.width = width
    this.height = width
    this.startNode = startNode
    this.endNode = endNode
    this.initGrid()
  }

  setGridType(type: string) {
    let fillColor = fillColorConfig.gridColor.fill
    switch(type) {
      case 'grid':
        break;
      case 'start':
        if (this.grid) {
          fillColor = fillColorConfig.startColor.fill
          this.gNum = 0
          break;
        }
        break
      case 'end':
        if (this.grid) {
          fillColor = fillColorConfig.endColor.fill
          break;
        }
        break
      case 'barrier':
        if (this.grid) {
          fillColor = fillColorConfig.barrierColor.fill
          break;
        }
        break
      default:
        break
    }

    this.setGridStyle(fillColor)

    this.gridType = type
  }

  setGridStyle(fillColor: string) {
    this.grid?.setStyle({
      fill: fillColor
    })
  }

  setFValue() {
    this.fText?.attr({
      // @ts-ignore
      style: {
        text: this.fNum
      },
      invisible: false
    })

    if (this.gridType !== 'end') {
      this.setGridStyle(fillColorConfig.calcFValueColor.fill)
    }
  }

  setGValue() {
    this.gText?.attr({
      // @ts-ignore
      style: {
        text: this.gNum
      },
      invisible: false
    })
  }

  setHValue() {
    this.hText?.attr({
      // @ts-ignore
      style: {
        text: this.hNum
      },
      invisible: false
    })
  }

  initGrid() {
    this.grid = new Rect({
      shape: {
        x: 0,
        y: 0,
        width: this.width,
        height: this.width
      },
      style: {
        fill: fillColorConfig.gridColor.fill,   // 填充色，设置为透明
        stroke: fillColorConfig.barrierColor.fill,   // 边框颜色，黑色
        lineWidth: 1   // 边框宽度为1像素
      }
    })

    this.setGridType('grid')

    this.fText = new Text({
      style: {
        x: this.width / 2 - 6,
        y: 2,
        text: 'a'
      },
      invisible: true,
      silent: true
    })

    this.gText = new Text({
      style: {
        x: 1,
        y: this.width / 2 + 4,
        text: 'g'
      },
      invisible: true,
      silent: true
    })

    this.hText = new Text({
      style: {
        x: this.width / 2 + 3,
        y: this.width / 2 + 4,
        text: 'h'
      },
      invisible: true,
      silent: true
    })

    this.add(this.grid)
    this.add(this.fText)
    this.add(this.hText)
    this.add(this.gText)
  }
}

interface AStarOpts {
  rowSize: number
  columnSize: number
  gridSize: number
}

class AStar {
  zr: ZRenderType
  gridSize = 40
  rowSize = 15
  columnSize = 15
  startNode = [7, 4]
  defaultStartNode = [7, 4]
  endNode = [7, 10]
  defaultEndNode = [7, 10]
  currentNode?: Grid
  allGridsList: Grid[] = []
  openList: Grid[] = []
  closeList: Grid[] = [] // 包含所有已经搜索过的点和障碍点的集合

  pathList: Grid[] = [] // 最终轨迹路线

  constructor({ rowSize, columnSize, gridSize }: AStarOpts) {
    this.zr = init(document.getElementById('a-star'), {
      devicePixelRatio: window.devicePixelRatio
    });
    this.rowSize = rowSize
    this.columnSize = columnSize
    this.gridSize = gridSize
    this.drawGrids()
    this.initEvent()
  }

  initEvent() {
    this.zr.on('mousedown', (event) => {
      if (!event.target) {
        return
      }
      this.currentNode = event.target.parent as Grid

      if (this.currentNode.type !== 'group') {
        return
      }

      if (this.currentNode.gridType === 'grid') {
        this.currentNode.setGridType('barrier') 
        this.closeList.push(this.currentNode)
      } else if (this.currentNode.gridType === 'barrier') {
        this.currentNode.setGridType('grid') 
        this.closeList = this.closeList.filter((n: Grid) => {
          if (this.currentNode) {
            if(n.id !== this.currentNode.id) {
              return n
            }
          }
        })
      }
    })

    this.zr.on('mouseup', (event) => {
      if (!event.target) {
        return
      }
      const target = event.target.parent as Grid

      if (this.currentNode && this.currentNode.gridType === 'start' && target.gridType === 'grid') {
        target.setGridType('start')
        this.currentNode.setGridType('grid')
        this.startNode = [target.row, target.column]
        // 重新设置起点后需要重新给openList设置初始值
        this.openList = [target]
      }
      if (this.currentNode && this.currentNode.gridType === 'end' && target.gridType === 'grid') {
        target.setGridType('end')
        this.currentNode.setGridType('grid')
        this.endNode = [target.row, target.column]
      }
    })
  }

  drawGrids() {
    for(let i = 0; i < this.rowSize; i++) {
      for(let j = 0; j < this.columnSize; j++) { 
        const grid = new Grid({
          row: i,
          column: j,
          width: this.gridSize,
          startNode: this.startNode,
          endNode: this.endNode
        });

        this.zr.add(grid)
        this.allGridsList.push(grid)

        // 开始节点
        if (i===this.startNode[0] && j === this.startNode[1]) {
          this.openList.push(grid)
          grid.setGridType('start')
        }

        // 开始节点
        if (i===this.endNode[0] && j === this.endNode[1]) {
          grid.setGridType('end')
        }
      }
    }
  }

  start() {
    // 1. 从 openList 中取出估值最小的点
    if (isFinished.value) {
      return
    }
    const node = this.openList.shift() as Grid

    if (!['start', 'end'].includes(node.gridType)) {
      node.setGridStyle(fillColorConfig.minFValueColor.fill)
    }

    // 如果最后一个点是终点，则结束查找
    if (node && node.row === this.endNode[0] && node.column === this.endNode[1]) {
      // 查询结束，显示最终路径
      this.showPath()
      isFinished.value = true
      return
    }

    // 2. 将从 openList 中删除的元素添加到 closeList 中
    this.closeList.push(node)

    // 3. 查找 node 节点周围的节点
    this.findNearNodes(node)

    // 4. 对 openList 中的节点按照 F 估值从小到大进行排序
    this.sortValue()

    if (!isTestMode.value) {
      this.start()
    }
    // console.log('===>>> openList', this.openList)
  }

  findNearNodes(node: Grid) {
    const nearNode: Grid[] = []

    // 先对所有的节点进行一次过滤，过滤掉已经在openList中的节点和已经在closeList中的节点以及障碍点进行过滤
    this.allGridsList.forEach((g: Grid) => {
      if (this.filter(g)) {
        nearNode.push(g)
      }
    })

    // 找到相邻的8个点，并加入到 openList 中
    nearNode.forEach((g: Grid) => {
      if (Math.abs(g.row - node.row) <=1 && Math.abs(g.column - node.column) <=1) {
        // 保存父节点，根据父节点可以确定最终路径
        g.parentGrid = node
        g.gNum = this.calcGValue(g, node)
        g.setGValue()
        g.hNum = this.calcHValue(g)
        g.setHValue()
        g.fNum = g.gNum + g.hNum
        g.setFValue()
        this.openList.push(g)
      }
    })
  }

  calcGValue(currGrid: Grid, pGrid: Grid) {
    const absRow = Math.abs(currGrid.row - pGrid.row)
    const absColumn = Math.abs(currGrid.column - pGrid.column)

    if (absRow === 1 && absColumn === 1) {
      return 14 + (pGrid.gNum as number)
    }
    return 10 + (pGrid.gNum as number)
  }

  calcHValue(currGrid: Grid) {
    // 采用曼哈顿算法
    const absRow = Math.abs(currGrid.row - this.endNode[0])
    const absColumn = Math.abs(currGrid.column - this.endNode[1])

    return absRow * 10 + absColumn * 10
  }

  filter(node: Grid) {
    for (let i = 0; i< this.closeList.length; i++) {
      if (node.id === this.closeList[i].id) {
        return false
      }
    }

    for (let i = 0; i< this.openList.length; i++) {
      if (node.id === this.openList[i].id) {
        return false
      }
    }

    return true
  }

  sortValue() {
    this.openList.sort((grid1: Grid, grid2: Grid) => {
      return (grid1.fNum as number) - (grid2.fNum as number)
    })
  }

  findParent(grid: Grid) {
    if (!grid.parentGrid) {
      return
    }
    this.pathList.push(grid)
    this.findParent(grid.parentGrid)
  }

  showPath() {
    const lastGrid = this.closeList.pop() as Grid

    this.pathList.unshift(lastGrid)

    this.findParent(lastGrid?.parentGrid as Grid)

    const pathPoints: Array<number[]> = []
    this.pathList.forEach((pathGrid: Grid) => {
      pathGrid.setGridStyle(fillColorConfig.pathColor.fill)
      pathPoints.push([pathGrid.x + pathGrid.width / 2, pathGrid.y + pathGrid.height / 2])
    })

    const pathLine = new zrender.Polyline({
      shape: {
        points: pathPoints
      },
      style: {
        stroke: '#e03131',
        lineWidth: 2 
      }
    })

    this.zr.add(pathLine)
  }

  clear() {
    this.startNode = this.defaultStartNode
    this.endNode = this.defaultEndNode

    this.closeList = []
    this.openList = []
    this.pathList = []
    this.allGridsList = []
    this.zr.clear()
    isFinished.value = false
    isTestMode.value = false
    this.drawGrids()
  }
}

onMounted(() => {
  const gridSize = 40
  const canvasHeight = document.body.clientHeight
  const rowSize = Math.ceil(document.body.clientHeight / gridSize)
  aStar.value = new AStar({ gridSize, rowSize, columnSize: rowSize })
  aStar.value.zr.resize({
    width: canvasHeight,
    height: canvasHeight
  })
});

const nextStep = () => {
  isTestMode.value = true
  if (aStar.value) {
    aStar.value.start()
  }
}

const start = () => {
  isTestMode.value = false
  if (aStar.value) {
    aStar.value.start()
  }
}

const clear = () => {
  if (aStar.value) {
    aStar.value.clear()
  }
}
</script>

<template>
  <div class="container">
    <canvas id="a-star"></canvas>
    <div class="desc">
      <div class="title">A星算法</div>
      <div class="tip">
        <div class="content">
          <div style="font-weight: bold; margin-bottom: 2px;">
            Tips:
          </div>
          <div>
            1. 拖动<span :style="{background: fillColorConfig.startColor.fill }">起点</span>或<span :style="{background: fillColorConfig.endColor.fill }">终点</span>网格支持重新设置“起点"或"终点"
          </div>
          <div>
            2. 点击空白网格支持设置“障碍物”点，再次点击障碍物点取消设置
          </div>
          <div>
            3. “获取最优路径”按钮会一次性获取A星算法的最优路径，并显示在画面中，“单步执行”按钮支持单步显示A星算法的计算结果，方便学习、测试使用。
          </div>
        </div>
      </div>
      <div class="card-warpper">
        <background-card
          v-for="item in Object.keys(fillColorConfig)"
          :key="item"
          :desc="fillColorConfig[item].desc"
          :bgColor="fillColorConfig[item].fill"
        />
      </div>

      <div class="btn-wrapper">
        <el-button
          type="primary"
          class="next-step-btn"
          @click="start"
        >
          获取最优路径
        </el-button>
        <el-button
          type="primary"
          class="next-step-btn"
          @click="nextStep"
        >
          单步执行(调试)
        </el-button>
        <el-button
          type="primary"
          color="#626aef"
          class="next-step-btn"
          @click="clear"
        >
          清空画布
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.container {
  display: flex;
  width: 100%;
  height: 100%;
  .desc {
    height: 100vh;
    flex: 1;
    .title {
      height: 10%;
      font-size: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: bold;
    }
    .card-warpper {
      display: flex;
      justify-content: center;
      height: 30%;
      padding-top: 45px;
    }
    .btn-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 20%
    }
    .tip {
      height: 25%;
      .content {
        margin: 10px 20px;
        border-radius: 5px;
        color: #fff;
        padding: 15px;
        background: #909399;
      }
    }
  }
  #a-star {
    margin: 0;
    padding: 0;
  }
}
</style>
