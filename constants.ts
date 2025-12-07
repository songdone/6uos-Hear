
import { Book, Series } from './types';

export const APP_NAME = "6uos Hear";
export const APP_SLOGAN = "留你听书·够 6 才好听"; // CORRECTED

export const STORAGE_KEYS = {
  USER: '6uos_user',
  LIBRARY: '6uos_library',
  PLAYER: '6uos_player_state',
};

export const DEMO_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

// Updated to Square Images (400x400)
export const DEFAULT_BOOKS: Book[] = [
  {
    id: 'b1',
    title: '三体: 地球往事',
    author: '刘慈欣',
    coverUrl: 'https://picsum.photos/400/400?random=1',
    duration: 3600,
    progress: 0,
    addedAt: Date.now(),
    audioUrl: DEMO_AUDIO_URL,
    seriesId: 's_santi',
    description: '文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划“红岸工程”取得了突破性进展...',
    chapters: [
       { title: '第一章: 疯狂年代', startTime: 0, duration: 600 },
       { title: '第二章: 寂静的春天', startTime: 600, duration: 900 },
       { title: '第三章: 红岸之巅', startTime: 1500, duration: 1200 },
       { title: '第四章: 科学边界', startTime: 2700, duration: 900 },
    ],
    characters: [
        { id: 'c1', name: '叶文洁', role: '天体物理学家', description: '红岸基地核心技术人员，ETO统帅。' },
        { id: 'c2', name: '汪淼', role: '纳米材料专家', description: '古筝行动核心策划人，看见了倒计时。' },
        { id: 'c3', name: '史强', role: '警察', description: '粗中有细，观察力敏锐的老刑警。' }
    ]
  },
  {
    id: 'b2',
    title: '活着',
    author: '余华',
    coverUrl: 'https://picsum.photos/400/400?random=2',
    duration: 1800,
    progress: 0,
    addedAt: Date.now() - 100000,
    audioUrl: DEMO_AUDIO_URL,
    description: '地主少爷福贵嗜赌成性，终于赌光了家业，一贫如洗...',
    chapters: [
       { title: '序言', startTime: 0, duration: 300 },
       { title: '第一部分: 浪荡岁月', startTime: 300, duration: 800 },
       { title: '第二部分: 艰难生存', startTime: 1100, duration: 700 },
    ],
    characters: [
        { id: 'c1', name: '福贵', role: '主角', description: '经历了一生的苦难，最后只有一头老牛相伴。' },
        { id: 'c2', name: '家珍', role: '妻子', description: '福贵的妻子，任劳任怨。' }
    ]
  },
  {
    id: 'b3',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    coverUrl: 'https://picsum.photos/400/400?random=3',
    duration: 4200,
    progress: 0,
    addedAt: Date.now() - 200000,
    audioUrl: DEMO_AUDIO_URL,
    chapters: [
       { title: '第一部分: 认知革命', startTime: 0, duration: 1000 },
       { title: '第二部分: 农业革命', startTime: 1000, duration: 1200 },
       { title: '第三部分: 人类的融合', startTime: 2200, duration: 1000 },
       { title: '第四部分: 科学革命', startTime: 3200, duration: 1000 },
    ]
  },
  {
    id: 'b4',
    title: '三体 II: 黑暗森林',
    author: '刘慈欣',
    coverUrl: 'https://picsum.photos/400/400?random=4',
    duration: 5000,
    progress: 0,
    seriesId: 's_santi',
    addedAt: Date.now() - 300000,
    audioUrl: DEMO_AUDIO_URL,
    chapters: [
       { title: '序章', startTime: 0, duration: 300 },
       { title: '上部: 面壁者', startTime: 300, duration: 2000 },
       { title: '中部: 咒语', startTime: 2300, duration: 1500 },
       { title: '下部: 黑暗森林', startTime: 3800, duration: 1200 },
    ],
    characters: [
        { id: 'c1', name: '罗辑', role: '面壁者', description: '参透了黑暗森林法则，建立了威慑。' }
    ]
  },
  {
    id: 'b5',
    title: '三体 III: 死神永生',
    author: '刘慈欣',
    coverUrl: 'https://picsum.photos/400/400?random=5',
    duration: 6000,
    progress: 0,
    seriesId: 's_santi',
    addedAt: Date.now() - 400000,
    audioUrl: DEMO_AUDIO_URL,
    chapters: [
        { title: '第一部', startTime: 0, duration: 2000 },
        { title: '第二部', startTime: 2000, duration: 2000 },
        { title: '第三部', startTime: 4000, duration: 2000 },
    ],
    characters: [
        { id: 'c1', name: '程心', role: '执剑人', description: '出于爱而做出了选择，导致了威慑的失败。' },
        { id: 'c2', name: '云天明', role: '大脑', description: '给人类送来了童话和情报。' }
    ]
  }
];

export const MOCK_SERIES: Series[] = [
  {
     id: 's_santi',
     title: '三体系列',
     coverUrl: 'https://picsum.photos/400/400?random=1',
     description: '中国科幻文学的里程碑之作。',
     books: ['b1', 'b4', 'b5']
  }
];
