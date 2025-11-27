let ws;
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const usernameInput = document.getElementById('username');
const statusDiv = document.getElementById('status');
const statusDot = document.getElementById('statusDot');
const latencyDiv = document.getElementById('latency');
const onlineCountDiv = document.getElementById('onlineCount');
const messageCountDiv = document.getElementById('messageCount');
const myMessageCountDiv = document.getElementById('myMessageCount');
const onlineCountHeader = document.getElementById('onlineCountHeader');
const clearBtn = document.getElementById('clearBtn');
const themeBtn = document.getElementById('themeBtn');

// 统计数据
let stats = {
    onlineCount: 0,
    messageCount: 0,
    myMessageCount: 0
};

// 连接WebSocket服务器
function connect() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    ws = new WebSocket(`${wsProtocol}://${host}`);

    // 连接成功
    ws.onopen = () => {
        updateStatus('online', '在线');
        messageInput.disabled = false;
        sendBtn.disabled = false;
        
        // 模拟延迟检测
        startLatencyCheck();
    };

    // 接收消息
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // 处理不同类型的消息
            if (data.type === 'stats') {
                updateStats(data);
            } else if (data.type === 'message') {
                addMessage(data.username, data.message, data.time);
                stats.messageCount++;
                updateMessageCount();
                
                // 检查是否是自己发送的消息
                if (data.username === (usernameInput.value.trim() || '匿名')) {
                    stats.myMessageCount++;
                    updateMyMessageCount();
                }
            }
        } catch (error) {
            console.error('解析消息失败:', error);
        }
    };

    // 连接关闭
    ws.onclose = () => {
        updateStatus('offline', '离线');
        messageInput.disabled = true;
        sendBtn.disabled = true;
        // 3秒后重连
        setTimeout(connect, 3000);
    };

    // 连接错误
    ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        updateStatus('connecting', '连接错误');
    };
}

// 更新连接状态
function updateStatus(status, text) {
    statusDiv.textContent = text;
    statusDot.className = 'status-dot';
    statusDot.classList.add(status);
    
    switch(status) {
        case 'online':
            statusDiv.style.color = '#30d158'; // 使用CSS变量中的绿色
            break;
        case 'offline':
            statusDiv.style.color = '#ff453a'; // 使用CSS变量中的红色
            break;
        case 'connecting':
            statusDiv.style.color = '#ff9f0a'; // 使用CSS变量中的橙色
            break;
    }
}

// 发送消息
function sendMessage() {
    const username = usernameInput.value.trim() || '匿名';
    const message = messageInput.value.trim();

    if (message && ws.readyState === WebSocket.OPEN) {
        const data = {
            type: 'message',
            username,
            message,
            time: new Date().toLocaleTimeString('zh-CN')
        };
        ws.send(JSON.stringify(data));
        messageInput.value = '';
    }
}

// 添加消息到界面
function addMessage(username, message, time) {
    // 移除空状态提示（如果存在）
    const emptyState = messagesDiv.querySelector('.empty');
    if (emptyState) {
        messagesDiv.removeChild(emptyState);
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.innerHTML = `
        <div class="message-header">
            <span class="username">${escapeHtml(username)}</span>
            <span class="time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(message)}</div>
    `;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 更新统计数据
function updateStats(data) {
    if (data.onlineCount !== undefined) {
        stats.onlineCount = data.onlineCount;
        onlineCountDiv.textContent = stats.onlineCount;
        onlineCountHeader.textContent = `${stats.onlineCount} 人在线`;
    }
}

// 更新消息计数
function updateMessageCount() {
    messageCountDiv.textContent = stats.messageCount;
}

// 更新我的消息计数
function updateMyMessageCount() {
    myMessageCountDiv.textContent = stats.myMessageCount;
}

// 简单的HTML转义防止XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 检测延迟
function startLatencyCheck() {
    if (ws.readyState !== WebSocket.OPEN) return;
    
    const checkLatency = () => {
        if (ws.readyState === WebSocket.OPEN) {
            const startTime = Date.now();
            const pingId = Math.random().toString(36).substr(2, 9);
            
            ws.send(JSON.stringify({
                type: 'ping',
                id: pingId,
                time: startTime
            }));
            
            // 监听pong响应
            const pongHandler = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong' && data.id === pingId) {
                        const latency = Date.now() - startTime;
                        latencyDiv.textContent = `${latency} ms`;
                        ws.removeEventListener('message', pongHandler);
                    }
                } catch (error) {
                    console.error('处理pong消息失败:', error);
                }
            };
            
            ws.addEventListener('message', pongHandler);
        }
    };
    
    // 立即检查一次，然后每5秒检查一次
    checkLatency();
    setInterval(checkLatency, 5000);
}

// 切换深色/浅色主题
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// 清空消息
// 清空消息
function clearMessages() {
    if (confirm('确定要清空所有消息吗？')) {
        while (messagesDiv.firstChild) {
            messagesDiv.removeChild(messagesDiv.firstChild);
        }
        
        // 重置统计数据（重要！）
        stats.messageCount = 0;
        stats.myMessageCount = 0;
        updateMessageCount();
        updateMyMessageCount();
        
        // 显示空状态
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty';
        emptyDiv.innerHTML = `
            <div class="empty-hero">✨</div>
            <p class="empty-title">暂无消息</p>
            <p class="empty-subtitle">输入昵称与消息，开始你的第一段对话。</p>
        `;
        messagesDiv.appendChild(emptyDiv);
    }
}


// 事件监听
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    // Shift + Enter 换行，Enter发送
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

clearBtn.addEventListener('click', clearMessages);
themeBtn.addEventListener('click', toggleTheme);

// 页面加载时恢复主题设置
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
    }
});


// ========================================
// UI 预留功能实现
// ========================================

// ========== 1. 搜索功能 ==========
const searchInput = document.querySelector('.search-input');
let allMessages = []; // 存储所有消息用于搜索

// 启用搜索框
searchInput.disabled = false;
searchInput.placeholder = '搜索消息 / 用户';

// ========== 修改 addMessage 函数（整合所有功能） ==========
const originalAddMessage = addMessage;
addMessage = function(username, message, time) {
    // 1. 调用原始函数显示消息
    originalAddMessage(username, message, time);
    
    // 2. 存储消息用于搜索功能
    allMessages.push({
        username: username,
        message: message,
        time: time,
        element: messagesDiv.lastElementChild
    });
    
    // 3. 记录用户及最后活跃时间
    onlineUsersMap.set(username, {
        lastTime: time,
        lastActiveTime: Date.now(),
        messageCount: (onlineUsersMap.get(username)?.messageCount || 0) + 1
    });
    
    // 4. 更新用户列表显示
    updateUsersList();
};


// 搜索功能实现
searchInput.addEventListener('input', function(e) {
    const keyword = e.target.value.trim().toLowerCase();
    const searchHint = document.querySelector('.search-hint');
    
    // 移除之前的高亮
    document.querySelectorAll('.message.search-highlight').forEach(el => {
        el.classList.remove('search-highlight');
    });
    
    if (keyword === '') {
        searchHint.textContent = '按 Enter 搜索';
        searchHint.style.color = '';
        return;
    }
    
    // 搜索匹配
    const results = allMessages.filter(msg => 
        msg.username.toLowerCase().includes(keyword) || 
        msg.message.toLowerCase().includes(keyword)
    );
    
    searchHint.textContent = `找到 ${results.length} 条`;
    searchHint.style.color = results.length > 0 ? 'var(--green)' : 'var(--red)';
});

// Enter 键高亮显示搜索结果
searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const keyword = e.target.value.trim().toLowerCase();
        if (keyword === '') return;
        
        // 清除之前的高亮
        document.querySelectorAll('.message.search-highlight').forEach(el => {
            el.classList.remove('search-highlight');
        });
        
        // 高亮匹配的消息
        let matchCount = 0;
        allMessages.forEach(msg => {
            if (msg.username.toLowerCase().includes(keyword) || 
                msg.message.toLowerCase().includes(keyword)) {
                if (msg.element && msg.element.parentNode) {
                    msg.element.classList.add('search-highlight');
                    matchCount++;
                    
                    // 滚动到第一个匹配项
                    if (matchCount === 1) {
                        msg.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        });
        
        document.querySelector('.search-hint').textContent = 
            matchCount > 0 ? `已高亮 ${matchCount} 条` : '未找到';
    }
});

// ========== 2. 在线用户列表 ==========
// ========== 2. 在线用户列表（带离线检测和活跃时间） ==========
let onlineUsersMap = new Map(); // 存储用户信息
const USER_TIMEOUT = 60000; // 60秒无活动视为离线

// 格式化时间差
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 10000) return '刚刚';
    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
}

// 更新用户列表显示
function updateUsersList() {
    const usersList = document.querySelector('.users-list');
    
    if (onlineUsersMap.size === 0) {
        usersList.innerHTML = `
            <div class="user-item shimmer"></div>
            <div class="user-item shimmer"></div>
            <div class="user-tip">暂无用户（消息发送后显示）</div>
        `;
        return;
    }
    
    let usersHTML = '';
    let index = 0;
    const currentUsername = usernameInput.value.trim();
    const now = Date.now();
    
    // 按最后活跃时间排序
    const sortedUsers = Array.from(onlineUsersMap.entries())
        .sort((a, b) => b[1].lastActiveTime - a[1].lastActiveTime);
    
    sortedUsers.forEach(([username, userData]) => {
        const avatarColor = getAvatarColor(index);
        const initial = username.charAt(0).toUpperCase();
        const isCurrentUser = username === currentUsername;
        
        // 判断用户是否在线
        const isOnline = (now - userData.lastActiveTime) < USER_TIMEOUT;
        const timeAgo = getTimeAgo(userData.lastActiveTime);
        
        usersHTML += `
            <div class="user-card ${isCurrentUser ? 'current-user' : ''} ${!isOnline ? 'offline' : ''}">
                <div class="user-avatar" style="background: ${avatarColor}">
                    ${initial}
                </div>
                <div class="user-info">
                    <div class="user-name">${escapeHtml(username)}${isCurrentUser ? ' (你)' : ''}</div>
                    <div class="user-status">
                        <span class="status-badge ${isOnline ? 'online' : 'offline'}">
                            ${isOnline ? '在线' : '离线'}
                        </span>
                        · ${timeAgo}
                    </div>
                </div>
                <div class="user-indicator ${!isOnline ? 'offline' : ''}"></div>
            </div>
        `;
        index++;
    });
    
    usersList.innerHTML = usersHTML;
}

// 生成头像颜色
function getAvatarColor(index) {
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    ];
    return colors[index % colors.length];
}

// 定时检查用户在线状态
setInterval(() => {
    if (onlineUsersMap.size > 0) {
        updateUsersList();
    }
}, 3000);

// 初始化用户列表
updateUsersList();



// ========== 3. 信息弹窗 ==========
// 创建弹窗 HTML
const modalHTML = `
<div class="info-modal" id="infoModal">
    <div class="modal-overlay"></div>
    <div class="modal-container">
        <div class="modal-header">
            <h3>📊 聊天室信息</h3>
            <button class="modal-close" id="closeModal">✕</button>
        </div>
        <div class="modal-body">
            <div class="info-section">
                <h4>实时统计</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-value" id="modalOnlineCount">0</div>
                        <div class="info-label">在线人数</div>
                    </div>
                    <div class="info-item">
                        <div class="info-value" id="modalMessageCount">0</div>
                        <div class="info-label">总消息数</div>
                    </div>
                    <div class="info-item">
                        <div class="info-value" id="modalMyCount">0</div>
                        <div class="info-label">我的消息</div>
                    </div>
                    <div class="info-item">
                        <div class="info-value" id="modalUserCount">0</div>
                        <div class="info-label">发言用户</div>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h4>✨ 功能特性</h4>
                <ul class="feature-list">
                    <li>🔍 消息搜索 - 输入关键词后按 Enter</li>
                    <li>👥 用户列表 - 实时显示发言用户</li>
                    <li>🌓 主题切换 - 支持明暗双主题</li>
                    <li>⌨️ 快捷键 - Shift + Enter 换行</li>
                    <li>📱 响应式 - 完美支持移动端</li>
                    <li>⚡ 实时同步 - WebSocket 低延迟</li>
                </ul>
            </div>
            
            <div class="info-section">
                <h4>ℹ️ 关于项目</h4>
                <div class="about-content">
                    <p><strong>项目名称：</strong>多人网络聊天室</p>
                    <p><strong>前端：</strong>JavaScript + HTML + CSS</p>
                    <p><strong>后端：</strong>Node.js + Socket.io</p>
                    <p><strong>作者：</strong>Sander</p>
                    <p class="about-footer">前后端分离+Websockte实时通信</p>
                </div>
            </div>
        </div>
    </div>
</div>
`;

// 插入弹窗到页面
document.body.insertAdjacentHTML('beforeend', modalHTML);

// 绑定信息按钮
const infoBtn = document.querySelector('.icon-btn[aria-label="info"]');
const infoModal = document.getElementById('infoModal');
const closeModalBtn = document.getElementById('closeModal');
const modalOverlay = infoModal.querySelector('.modal-overlay');

// 打开弹窗
infoBtn.addEventListener('click', function() {
    // 更新数据
    document.getElementById('modalOnlineCount').textContent = stats.onlineCount;
    document.getElementById('modalMessageCount').textContent = stats.messageCount;
    document.getElementById('modalMyCount').textContent = stats.myMessageCount;
    document.getElementById('modalUserCount').textContent = onlineUsersMap.size;
    
    // 显示弹窗
    infoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// 关闭弹窗
function closeModal() {
    infoModal.classList.remove('active');
    document.body.style.overflow = '';
}

closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// ESC 键关闭
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && infoModal.classList.contains('active')) {
        closeModal();
    }
});

// 初始化用户列表
updateUsersList();



// 页面打开时直接连接服务器（保持不变）
connect();