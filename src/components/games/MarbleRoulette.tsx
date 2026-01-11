'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 핀볼 스타일 마블 룰렛 게임 컴포넌트
interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  number: number;
  color: string;
  finished: boolean;
  finishOrder: number;
  // 멈춤 감지용
  lastX: number;
  lastY: number;
  stuckTime: number;
}

interface MovingObstacle {
  x: number;
  y: number;
  angle: number;
  length: number;
  speed: number;
  type: 'bar' | 'spinner' | 'pendulum';
  pivotX?: number;
  pivotY?: number;
  armLength?: number;
  // 180~360도 왕복 운동용
  minAngle: number;
  maxAngle: number;
  direction: number;
}

interface Bumper {
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// 맵 타입 정의
type MapType = 'zigzag' | 'funnel' | 'chaos';

interface MapConfig {
  id: MapType;
  name: string;
  emoji: string;
  description: string;
}

const MAPS: MapConfig[] = [
  { id: 'zigzag', name: '지그재그', emoji: '⚡', description: '기본 지그재그 경로' },
  { id: 'funnel', name: '깔때기', emoji: '🔻', description: '좁아지는 스릴' },
  { id: 'chaos', name: '카오스', emoji: '🌀', description: '예측불가 혼돈' },
];

// 색상 배열 (50개)
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
  '#FF69B4', '#32CD32', '#FFD700', '#FF4500', '#9370DB', '#20B2AA',
  '#FF6347', '#4169E1', '#8B4513', '#2E8B57', '#DC143C', '#00BFFF',
  '#FF1493', '#7B68EE', '#3CB371', '#FA8072', '#87CEEB', '#FFA07A',
  '#6B8E23', '#48D1CC', '#C71585', '#B8860B', '#008B8B', '#9932CC',
  '#8FBC8F', '#E9967A', '#8A2BE2', '#A0522D', '#5F9EA0', '#D2691E',
  '#CD5C5C', '#4682B4', '#D2B48C', '#708090', '#BC8F8F', '#00FA9A',
  '#F0E68C', '#DA70D6'
];

type WinCondition = 'first' | 'last';

export default function MarbleRoulette() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const obstaclesRef = useRef<MovingObstacle[]>([]);
  const bumpersRef = useRef<Bumper[]>([]);
  const wallsRef = useRef<Wall[]>([]);
  
  const [numPlayers, setNumPlayers] = useState(4);
  const [showSettings, setShowSettings] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [remainingBalls, setRemainingBalls] = useState(0);
  const [winCondition, setWinCondition] = useState<WinCondition>('first');
  const [selectedMap, setSelectedMap] = useState<MapType>('zigzag');
  
  // 슬로우 모션 & 줌 상태
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const slowMotionRef = useRef(false);
  const zoomTargetRef = useRef<{ x: number; y: number } | null>(null);
  
  // 빨리감기 상태 (20초 초과 시)
  const [isFastForward, setIsFastForward] = useState(false);
  const fastForwardRef = useRef(false);
  const gameStartTimeRef = useRef<number>(0);

  // 맵별 벽 생성
  const generateWalls = useCallback((width: number, height: number, mapType: MapType): Wall[] => {
    const walls: Wall[] = [];
    
    switch (mapType) {
      case 'zigzag': {
        // 지그재그 벽 (세그먼트 증가)
        const segments = 10;
        const segmentHeight = height / segments;
        const indent = width * 0.28;
        
        for (let i = 0; i < segments; i++) {
          const y1 = i * segmentHeight;
          const y2 = (i + 1) * segmentHeight;
          
          if (i % 2 === 0) {
            walls.push({ x1: 30, y1, x2: 30 + indent, y2 });
            walls.push({ x1: width - 30, y1, x2: width - 30 - indent, y2 });
          } else {
            walls.push({ x1: 30 + indent, y1, x2: 30, y2 });
            walls.push({ x1: width - 30 - indent, y1, x2: width - 30, y2 });
          }
          
          // 추가 중앙 장애물 (경사 있게)
          if (i > 0 && i < segments - 1 && i % 2 === 0) {
            const midX = width / 2;
            const slope = (i % 4 === 0 ? 1 : -1) * 15; // 경사 추가
            walls.push({ x1: midX - 30, y1: y1 + segmentHeight * 0.3, x2: midX + 30, y2: y1 + segmentHeight * 0.3 + slope });
          }
        }
        break;
      }
      
      case 'funnel': {
        // 깔때기 - 점점 좁아지는 벽 (섹션 증가)
        const sections = 8;
        for (let i = 0; i < sections; i++) {
          const y1 = i * (height / sections);
          const y2 = (i + 1) * (height / sections);
          const narrowing = (i / sections) * (width * 0.38);
          
          walls.push({ x1: 20 + narrowing, y1, x2: 20 + narrowing + 15, y2 });
          walls.push({ x1: width - 20 - narrowing, y1, x2: width - 20 - narrowing - 15, y2 });
          
          // 중간 방해물 (경사 있게)
          if (i > 0 && i < sections - 1) {
            const midX = width / 2;
            const offset = (i % 2 === 0 ? -1 : 1) * (30 + i * 5);
            const slope = (i % 2 === 0 ? 1 : -1) * 18; // 경사 추가
            walls.push({ x1: midX + offset - 40, y1: y1 + 30, x2: midX + offset + 40, y2: y1 + 30 + slope });
            
            // 추가 작은 벽 (경사 있게)
            if (i % 2 === 1) {
              const slope2 = (i % 4 === 1 ? 1 : -1) * 12;
              walls.push({ x1: midX - offset - 25, y1: y1 + 60, x2: midX - offset + 25, y2: y1 + 60 + slope2 });
            }
          }
        }
        break;
      }
      
      
      case 'chaos': {
        // 카오스 - 랜덤한 벽들 (항상 경사 있게)
        for (let i = 0; i < 25; i++) {
          const x = 50 + Math.random() * (width - 100);
          const y = 60 + Math.random() * (height - 150);
          // 최소 15도 ~ 최대 75도 경사 (수평 방지)
          const angle = (Math.PI / 12) + Math.random() * (Math.PI / 2);
          const direction = Math.random() > 0.5 ? 1 : -1;
          const len = 25 + Math.random() * 50;
          
          walls.push({
            x1: x - Math.cos(angle * direction) * len / 2,
            y1: y - Math.sin(angle) * len / 2,
            x2: x + Math.cos(angle * direction) * len / 2,
            y2: y + Math.sin(angle) * len / 2,
          });
        }
        break;
      }
      
      default:
        // 기본 벽
        walls.push({ x1: 30, y1: 0, x2: 30, y2: height });
        walls.push({ x1: width - 30, y1: 0, x2: width - 30, y2: height });
        break;
    }
    
    return walls;
  }, []);

  // 맵별 범퍼 생성 (비활성화)
  const generateBumpers = useCallback((): Bumper[] => {
    return []; // 범퍼 제거
  }, []);

  // 180~360도 범위의 랜덤 왕복 운동 생성 헬퍼
  const createSwingObstacle = (
    x: number, y: number, length: number, speed: number, 
    type: 'bar' | 'spinner' | 'pendulum',
    extras?: { pivotX?: number; pivotY?: number; armLength?: number }
  ): MovingObstacle => {
    // 180도(π) ~ 360도(2π) 사이의 랜덤 범위
    const range = Math.PI + Math.random() * Math.PI; // π ~ 2π
    const startAngle = Math.random() * Math.PI * 2;
    return {
      x, y, length, speed, type,
      angle: startAngle,
      minAngle: startAngle,
      maxAngle: startAngle + range,
      direction: Math.random() > 0.5 ? 1 : -1,
      ...extras,
    };
  };

  // 맵별 움직이는 장애물 생성
  const generateObstacles = useCallback((width: number, height: number, mapType: MapType): MovingObstacle[] => {
    const obstacles: MovingObstacle[] = [];
    
    switch (mapType) {
      case 'zigzag': {
        // 회전 막대 (더 많이, 전체 영역에)
        const rows = 6;
        const cols = 4;
        const startY = height * 0.15;
        const rowHeight = (height * 0.7) / rows;
        
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            obstacles.push(createSwingObstacle(
              (col + 1) * (width / (cols + 1)),
              startY + row * rowHeight,
              35 + Math.random() * 15,
              0.025 + Math.random() * 0.025,
              'bar'
            ));
          }
        }
        break;
      }
      
      case 'funnel': {
        // 좌우로 움직이는 막대 (더 많이)
        for (let i = 0; i < 8; i++) {
          obstacles.push(createSwingObstacle(
            width / 2 + (i % 2 === 0 ? -30 : 30),
            120 + i * 80,
            50 - (i % 4) * 5,
            0.035 + Math.random() * 0.02,
            'bar'
          ));
        }
        break;
      }
      
      case 'chaos': {
        // 다양한 회전 장애물 (더 많이)
        for (let i = 0; i < 20; i++) {
          obstacles.push(createSwingObstacle(
            55 + Math.random() * (width - 110),
            80 + Math.random() * (height - 180),
            22 + Math.random() * 28,
            0.02 + Math.random() * 0.04,
            'spinner'
          ));
        }
        break;
      }
    }
    
    return obstacles;
  }, []);

  // 공 생성
  const createBalls = useCallback((width: number): Ball[] => {
    const newBalls: Ball[] = [];
    
    for (let i = 0; i < numPlayers; i++) {
      const startX = width / 2 + (Math.random() - 0.5) * 60;
      const startY = -20 - i * 30;
      newBalls.push({
        id: i,
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 2 + 1,
        radius: 10,
        number: i + 1,
        color: COLORS[i % COLORS.length],
        finished: false,
        finishOrder: 0,
        // 멈춤 감지용 초기화
        lastX: startX,
        lastY: startY,
        stuckTime: 0,
      });
    }
    
    return newBalls;
  }, [numPlayers]);

  // 게임 시작
  const handleStart = () => {
    if (numPlayers < 2) return;
    setShowSettings(false);
    setWinner(null);
    setGameStarted(true);
    setRemainingBalls(numPlayers);
    setIsSlowMotion(false);
    setIsFastForward(false);
    slowMotionRef.current = false;
    fastForwardRef.current = false;
    zoomTargetRef.current = null;
    gameStartTimeRef.current = Date.now();
  };

  // 선 충돌 감지
  const lineCircleCollision = (
    ball: Ball,
    x1: number, y1: number, x2: number, y2: number
  ): { collides: boolean; normal: { x: number; y: number }; depth: number } => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { collides: false, normal: { x: 0, y: 0 }, depth: 0 };
    
    const fx = ball.x - x1;
    const fy = ball.y - y1;
    const t = Math.max(0, Math.min(1, (fx * dx + fy * dy) / (len * len)));
    
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distance = Math.sqrt(distX * distX + distY * distY);
    
    const collisionDist = ball.radius + 4;
    
    if (distance < collisionDist && distance > 0) {
      return {
        collides: true,
        normal: { x: distX / distance, y: distY / distance },
        depth: collisionDist - distance
      };
    }
    
    return { collides: false, normal: { x: 0, y: 0 }, depth: 0 };
  };

  // 원형 범퍼 충돌 감지
  const circleCollision = (ball: Ball, bumper: Bumper): boolean => {
    const dx = ball.x - bumper.x;
    const dy = ball.y - bumper.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < ball.radius + bumper.radius;
  };

  // 물리 시뮬레이션
  useEffect(() => {
    if (!gameStarted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    wallsRef.current = generateWalls(width, height, selectedMap);
    bumpersRef.current = generateBumpers();
    obstaclesRef.current = generateObstacles(width, height, selectedMap);
    
    let currentBalls = createBalls(width);
    let finishCount = 0;
    let gameWinner: number | null = null;
    let lastBall: number | null = null;

    const baseGravity = 0.5;  // 중력 증가 (0.2 → 0.5)
    const friction = 0.998;   // 마찰 감소 (0.995 → 0.998)
    const bounceFactor = 0.65;
    const finishLine = height - 35;
    const minSpeed = 0.5;     // 최소 속도 (멈춤 방지)

    const animate = () => {
      // 20초 경과 체크 - 빨리감기 활성화
      const elapsedTime = (Date.now() - gameStartTimeRef.current) / 1000;
      if (elapsedTime > 20 && !fastForwardRef.current && !slowMotionRef.current) {
        fastForwardRef.current = true;
        setIsFastForward(true);
      }
      
      // 속도 조절: 슬로우모션 > 일반 > 빨리감기
      let timeScale = 1;
      if (slowMotionRef.current) {
        timeScale = 0.15;
      } else if (fastForwardRef.current) {
        timeScale = 3; // 3배속
      }
      const gravity = baseGravity * timeScale;
      
      const zoom = zoomTargetRef.current;
      
      ctx.save();
      
      // 배경
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);
      
      // 줌 적용
      if (zoom) {
        const scale = 2;
        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-zoom.x, -zoom.y);
      }

      // 맵별 배경 효과 (필요시 추가)

      // 벽 그리기
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 5;
      
      wallsRef.current.forEach((wall) => {
        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();
      });
      
      // 범퍼 그리기
      bumpersRef.current.forEach((bumper) => {
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
        ctx.fillStyle = bumper.color;
        ctx.shadowColor = bumper.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        
        // 하이라이트
        ctx.beginPath();
        ctx.arc(bumper.x - bumper.radius * 0.3, bumper.y - bumper.radius * 0.3, bumper.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();
      });
      
      ctx.shadowBlur = 0;

      // 움직이는 장애물 업데이트 및 그리기
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ff6b6b';
      ctx.shadowBlur = 8;
      
      obstaclesRef.current.forEach((obs) => {
        // 180~360도 범위 왕복 운동
        obs.angle += obs.speed * obs.direction * timeScale;
        
        // 범위 끝에 도달하면 방향 전환
        if (obs.angle >= obs.maxAngle) {
          obs.angle = obs.maxAngle;
          obs.direction = -1;
        } else if (obs.angle <= obs.minAngle) {
          obs.angle = obs.minAngle;
          obs.direction = 1;
        }
        
        let x1, y1, x2, y2;
        
        if (obs.type === 'pendulum' && obs.pivotX !== undefined && obs.pivotY !== undefined && obs.armLength !== undefined) {
          // 진자 운동
          const swing = Math.sin(obs.angle * 3) * (Math.PI / 3);
          const endX = obs.pivotX + Math.sin(swing) * obs.armLength;
          const endY = obs.pivotY + Math.cos(swing) * obs.armLength;
          obs.x = endX;
          obs.y = endY;
        }
        
        const halfLen = obs.length / 2;
        x1 = obs.x - Math.cos(obs.angle) * halfLen;
        y1 = obs.y - Math.sin(obs.angle) * halfLen;
        x2 = obs.x + Math.cos(obs.angle) * halfLen;
        y2 = obs.y + Math.sin(obs.angle) * halfLen;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // 진자는 피벗 연결선 그리기
        if (obs.type === 'pendulum' && obs.pivotX !== undefined && obs.pivotY !== undefined) {
          ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(obs.pivotX, obs.pivotY);
          ctx.lineTo(obs.x, obs.y);
          ctx.stroke();
          ctx.strokeStyle = '#ff6b6b';
          ctx.lineWidth = 6;
        }
      });
      
      ctx.shadowBlur = 0;

      // 바닥 라인
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(50, finishLine + 5);
      ctx.lineTo(width - 50, finishLine + 5);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 공 업데이트
      currentBalls = currentBalls.map((ball) => {
        if (ball.finished) return ball;

        ball.vy += gravity;
        ball.vx *= Math.pow(friction, timeScale);
        ball.vy *= Math.pow(friction, timeScale);
        
        // 구슬이 너무 느려지면 최소 속도 유지 (멈춤 방지)
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed < minSpeed && ball.y < finishLine - 50) {
          // 아래로 약간의 속도 추가
          ball.vy += 0.3;
          // 좌우 랜덤 흔들림
          ball.vx += (Math.random() - 0.5) * 0.5;
        }

        ball.x += ball.vx * timeScale;
        ball.y += ball.vy * timeScale;
        
        // 3초간 같은 위치에 멈춰있으면 시작 위치로 리셋
        const moveThreshold = 15; // 이동 감지 임계값 (픽셀)
        const distMoved = Math.sqrt(
          Math.pow(ball.x - ball.lastX, 2) + Math.pow(ball.y - ball.lastY, 2)
        );
        
        if (distMoved < moveThreshold && ball.y > 0) {
          // 거의 안 움직임 - 멈춤 시간 누적
          ball.stuckTime += 16.67 * timeScale; // 약 60fps 기준
        } else {
          // 움직임 - 위치 갱신 및 시간 리셋
          ball.lastX = ball.x;
          ball.lastY = ball.y;
          ball.stuckTime = 0;
        }
        
        // 3초(3000ms) 이상 멈춰있으면 시작 위치로 리셋
        if (ball.stuckTime > 3000) {
          ball.x = width / 2 + (Math.random() - 0.5) * 60;
          ball.y = -20;
          // 속도는 0으로 초기화 (중력으로 자연스럽게 가속)
          ball.vx = 0;
          ball.vy = 0;
          ball.lastX = ball.x;
          ball.lastY = ball.y;
          ball.stuckTime = 0;
        }

        // 벽 충돌
        wallsRef.current.forEach((wall) => {
          const collision = lineCircleCollision(ball, wall.x1, wall.y1, wall.x2, wall.y2);
          if (collision.collides) {
            const dot = ball.vx * collision.normal.x + ball.vy * collision.normal.y;
            ball.vx = (ball.vx - 2 * dot * collision.normal.x) * bounceFactor;
            ball.vy = (ball.vy - 2 * dot * collision.normal.y) * bounceFactor;
            ball.x += collision.normal.x * collision.depth;
            ball.y += collision.normal.y * collision.depth;
          }
        });

        // 범퍼 충돌 (부드럽게 튕기기)
        bumpersRef.current.forEach((bumper) => {
          if (circleCollision(ball, bumper)) {
            const dx = ball.x - bumper.x;
            const dy = ball.y - bumper.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / distance;
            const ny = dy / distance;
            
            // 적당히 튕기기 (강도 감소)
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const bounceStrength = 0.7;
            ball.vx = nx * (speed * bounceStrength + 1.5);
            ball.vy = ny * (speed * bounceStrength + 1.5);
            
            // 위치 보정
            const overlap = ball.radius + bumper.radius - distance;
            ball.x += nx * overlap;
            ball.y += ny * overlap;
          }
        });

        // 움직이는 장애물 충돌
        obstaclesRef.current.forEach((obs) => {
          const halfLen = obs.length / 2;
          const x1 = obs.x - Math.cos(obs.angle) * halfLen;
          const y1 = obs.y - Math.sin(obs.angle) * halfLen;
          const x2 = obs.x + Math.cos(obs.angle) * halfLen;
          const y2 = obs.y + Math.sin(obs.angle) * halfLen;
          
          const collision = lineCircleCollision(ball, x1, y1, x2, y2);
          if (collision.collides) {
            const dot = ball.vx * collision.normal.x + ball.vy * collision.normal.y;
            ball.vx = (ball.vx - 2 * dot * collision.normal.x) * bounceFactor;
            ball.vy = (ball.vy - 2 * dot * collision.normal.y) * bounceFactor;
            ball.x += collision.normal.x * collision.depth;
            ball.y += collision.normal.y * collision.depth;
            
            ball.vx += obs.speed * Math.cos(obs.angle) * 8;
            ball.vy += obs.speed * Math.sin(obs.angle) * 8;
          }
        });

        // 좌우 경계
        if (ball.x - ball.radius < 20) {
          ball.x = 20 + ball.radius;
          ball.vx = Math.abs(ball.vx) * bounceFactor;
        }
        if (ball.x + ball.radius > width - 20) {
          ball.x = width - 20 - ball.radius;
          ball.vx = -Math.abs(ball.vx) * bounceFactor;
        }

        // 바닥 도달
        if (ball.y + ball.radius >= finishLine && !ball.finished) {
          ball.finished = true;
          ball.finishOrder = ++finishCount;
          ball.y = finishLine - ball.radius;
          ball.vy = 0;
          ball.vx = 0;
          lastBall = ball.number;
        }

        return ball;
      });

      // 슬로우 모션 트리거
      const activeBalls = currentBalls.filter((b) => !b.finished);
      const finishedCount = currentBalls.filter(b => b.finished).length;
      
      if (winCondition === 'first' && finishedCount === 0 && activeBalls.length > 0) {
        const lowestBall = activeBalls.reduce((a, b) => a.y > b.y ? a : b);
        if (lowestBall.y > finishLine - 80 && !slowMotionRef.current) {
          slowMotionRef.current = true;
          zoomTargetRef.current = { x: lowestBall.x, y: lowestBall.y };
          setIsSlowMotion(true);
        }
        if (slowMotionRef.current && lowestBall) {
          zoomTargetRef.current = { x: lowestBall.x, y: lowestBall.y };
        }
      } else if (winCondition === 'last' && activeBalls.length === 1) {
        const lastActiveBall = activeBalls[0];
        if (lastActiveBall.y > finishLine - 80 && !slowMotionRef.current) {
          slowMotionRef.current = true;
          zoomTargetRef.current = { x: lastActiveBall.x, y: lastActiveBall.y };
          setIsSlowMotion(true);
        }
        if (slowMotionRef.current) {
          zoomTargetRef.current = { x: lastActiveBall.x, y: lastActiveBall.y };
        }
      }

      // 당첨자 결정
      if (winCondition === 'first' && finishedCount === 1 && gameWinner === null) {
        const firstBall = currentBalls.find(b => b.finishOrder === 1);
        if (firstBall) {
          gameWinner = firstBall.number;
          setWinner(gameWinner);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          setTimeout(() => {
            slowMotionRef.current = false;
            zoomTargetRef.current = null;
            setIsSlowMotion(false);
            // 1등 나온 후 3배속 활성화
            fastForwardRef.current = true;
            setIsFastForward(true);
          }, 1500);
        }
      } else if (winCondition === 'last' && activeBalls.length === 0 && gameWinner === null) {
        if (lastBall !== null) {
          gameWinner = lastBall;
          setWinner(gameWinner);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          setTimeout(() => {
            slowMotionRef.current = false;
            zoomTargetRef.current = null;
            setIsSlowMotion(false);
            // 1등 나온 후 3배속 활성화
            fastForwardRef.current = true;
            setIsFastForward(true);
          }, 1500);
        }
      }

      // 공 그리기
      currentBalls.forEach((ball) => {
        ctx.beginPath();
        ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(ball.x - 3, ball.y - 3, ball.radius / 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.number.toString(), ball.x, ball.y);
      });
      
      ctx.restore();

      setBalls([...currentBalls]);
      setRemainingBalls(activeBalls.length);

      if (activeBalls.length > 0 || currentBalls.some((b) => b.y < 0)) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setGameStarted(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameStarted, numPlayers, createBalls, generateWalls, generateBumpers, generateObstacles, selectedMap, winCondition]);

  const handleReset = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setWinner(null);
    setBalls([]);
    setShowSettings(true);
    setGameStarted(false);
    setIsSlowMotion(false);
    setIsFastForward(false);
    slowMotionRef.current = false;
    fastForwardRef.current = false;
    zoomTargetRef.current = null;
  };

  const handleRespin = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setWinner(null);
    setBalls([]);
    setGameStarted(true);
    setRemainingBalls(numPlayers);
    setIsSlowMotion(false);
    setIsFastForward(false);
    slowMotionRef.current = false;
    fastForwardRef.current = false;
    zoomTargetRef.current = null;
    gameStartTimeRef.current = Date.now();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#1a1a2e] overflow-hidden">
      {showSettings ? (
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl my-4">
            <h1 className="text-center text-2xl font-bold text-gray-800">🎱 마블 룰렛</h1>
            
            {/* 인원 수 */}
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">{numPlayers}명</div>
              <input
                type="range"
                min="2"
                max="50"
                value={numPlayers}
                onChange={(e) => setNumPlayers(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>2명</span>
                <span>50명</span>
              </div>
            </div>

            {/* 맵 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">맵 선택</label>
              <div className="grid grid-cols-2 gap-2">
                {MAPS.map((map) => (
                  <button
                    key={map.id}
                    onClick={() => setSelectedMap(map.id)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      selectedMap === map.id
                        ? 'bg-indigo-500 text-white ring-2 ring-indigo-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-xl mb-1">{map.emoji}</div>
                    <div className="text-sm font-bold">{map.name}</div>
                    <div className="text-xs opacity-75">{map.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 당첨 기준 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">당첨 기준</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setWinCondition('first')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    winCondition === 'first'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  🥇 첫번째
                </button>
                <button
                  onClick={() => setWinCondition('last')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    winCondition === 'last'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  🐢 마지막
                </button>
              </div>
            </div>

            {/* 참가자 미리보기 */}
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: numPlayers }).map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            <button
              onClick={handleStart}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-base font-bold text-white transition-all hover:from-indigo-600 hover:to-purple-600 active:scale-95"
            >
              🎱 Start
            </button>
            
            <button
              onClick={() => router.push('/single')}
              className="w-full rounded-xl bg-gray-400 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-gray-500"
            >
              다른 게임
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#0f0f1a] flex-shrink-0">
            <div>
              <h1 className="text-lg font-bold text-cyan-400">🎱 {MAPS.find(m => m.id === selectedMap)?.name}</h1>
              <span className="text-xs text-gray-500">
                {winCondition === 'first' ? '🥇 첫번째' : '🐢 마지막'}
              </span>
            </div>
            {winner !== null ? (
              <div className="text-sm font-bold text-yellow-400 animate-pulse">
                🎉 {winner}번 당첨!
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                남은 공: {remainingBalls}
              </div>
            )}
          </div>

          {isSlowMotion && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-red-500/80 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse z-10">
              🎬 SLOW MOTION
            </div>
          )}
          
          {isFastForward && !isSlowMotion && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-orange-500/80 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse z-10">
              ⏩ FAST FORWARD (3x)
            </div>
          )}

          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={350}
                height={700}
                className="max-w-full max-h-full"
              />
            </div>

            <div className="w-24 bg-[#0f0f1a] p-2 overflow-y-auto flex-shrink-0">
              <div className="text-xs font-bold text-cyan-400 mb-2">참가자</div>
              <div className="space-y-1">
                {Array.from({ length: numPlayers }).map((_, index) => {
                  const ball = balls.find(b => b.number === index + 1);
                  const isWinner = winner === index + 1;
                  const isFinished = ball?.finished;
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-1 p-1 rounded text-xs ${
                        isWinner ? 'bg-yellow-500/30 ring-1 ring-yellow-400' : 
                        isFinished ? 'opacity-50' : ''
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <span className="text-white">{index + 1}번</span>
                      {ball?.finishOrder ? (
                        <span className="text-gray-500 text-[10px]">#{ball.finishOrder}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-2 bg-[#0f0f1a] flex-shrink-0">
            {!gameStarted && winner !== null && (
              <>
                <button
                  onClick={handleRespin}
                  className="flex-1 rounded-xl bg-red-500 px-3 py-2 text-sm font-bold text-white transition-all hover:bg-red-600 active:scale-95"
                >
                  다시 돌리기
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 rounded-xl bg-gray-500 px-3 py-2 text-sm font-bold text-white transition-all hover:bg-gray-600 active:scale-95"
                >
                  설정 변경
                </button>
              </>
            )}
            {gameStarted && (
              <div className="flex-1 text-center text-cyan-400 font-bold py-2 animate-pulse">
                떨어지는 중...
              </div>
            )}
            <button
              onClick={() => router.push('/single')}
              className="rounded-xl bg-gray-600 px-3 py-2 text-sm font-bold text-white transition-all hover:bg-gray-700 active:scale-95"
            >
              나가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
