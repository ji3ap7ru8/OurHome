// 大廳頂部列（帳號徽章 + 提醒/個人化按鈕）模板
export const headerTemplate = `
            <div class="relative z-10 px-5 pt-5 pb-2 flex justify-between items-center">
                <!-- User Profile Badge (已登入顯示網頁狀態；未登入彈出登入頁) -->
                <div id="headerUser" data-action="header-user" class="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity active:scale-95" title="帳號資訊">
                    <div id="userAvatar" class="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-black text-sm soft-shadow-sm">
                        <i class="fa-solid fa-user-large"></i>
                    </div>
                    <div class="flex flex-col">
                        <span id="userName" class="text-sm font-black text-slate-800 dark:text-slate-100 tracking-wider leading-none">訪客</span>
                        <span id="userStatus" class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">未登入 Google 帳號</span>
                    </div>
                </div>

                <!-- 家庭公告頁專用：左側標題（固定配色，不受主題影響；其他頁隱藏） -->
                <h2 id="headerNotesTitle" class="hidden items-center gap-2 text-xl font-black tracking-wide" style="color:#451a03"><i class="fa-solid fa-thumbtack" style="color:#d97706"></i> 家庭公告欄</h2>

                <!-- 生活圖卡頁專用：左側標題 + 副標（其他頁隱藏） -->
                <div id="headerCardsTitle" class="hidden flex-col min-w-0 pr-2">
                    <h2 class="flex items-center gap-2 text-xl font-black leading-tight text-slate-900 dark:text-slate-100"><i class="fa-solid fa-images theme-text-primary"></i><span>生活圖卡</span></h2>
                    <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">點一下卡片顯示條碼</p>
                </div>

                <!-- 換誰洗碗頁專用：左側標題（其他頁隱藏） -->
                <h2 id="headerBowlTitle" class="hidden items-center gap-2 text-xl font-black leading-tight text-slate-900 dark:text-slate-100"><i class="fa-solid fa-utensils theme-text-primary"></i><span>換誰洗碗</span></h2>

                <!-- 我的筆記頁專用：左側標題（其他頁隱藏） -->
                <h2 id="headerMemoTitle" class="hidden items-center gap-2 text-lg shrink-0 font-black leading-tight text-slate-900 dark:text-slate-100"><i class="fa-solid fa-book-open theme-text-primary"></i><span>我的筆記</span></h2>

                <!-- 家庭日曆頁專用：左側日曆切換按鈕（由 services/calendar 放進來；其他頁隱藏） -->
                <div id="headerCalSlot" class="hidden items-center flex-1 min-w-0 pr-2"></div>

                <!-- 所有應用頁專用：置中標題（其他頁隱藏） -->
                <h2 id="headerTitle" class="hidden absolute inset-x-0 top-5 h-10 items-center justify-center text-xl font-black text-slate-800 dark:text-slate-100 tracking-wider pointer-events-none">所有應用</h2>

                <!-- Header Actions -->
                <div class="flex items-center gap-2 ml-auto">
                    <!-- 家庭日曆頁專用：回到今天（顏色跟著主色調；其他頁隱藏） -->
                    <button id="headerTodayBtn" data-action="calendar-today" data-tip="cal-today" class="hidden h-10 px-3 rounded-2xl bg-white dark:bg-slate-800 soft-shadow-sm hover:scale-105 active:scale-95 transition-all items-center gap-1.5 font-black text-sm theme-text-primary" title="回到今天">
                        <i class="fa-solid fa-calendar-day"></i> 今天
                    </button>

                    <!-- 換誰洗碗頁專用：覆蓋儲存（先刪除伺服器上整份換誰洗碗資料，再存入目前資料；其他頁隱藏） -->
                    <button id="headerBowlSaveBtn" data-action="bowl-overwrite" class="hidden h-10 px-2.5 rounded-2xl bg-white dark:bg-slate-800 soft-shadow-sm hover:scale-105 active:scale-95 transition-all items-center gap-1 font-black text-[0.8rem] theme-text-primary" title="覆蓋儲存" aria-label="覆蓋儲存">
                        <i class="fa-solid fa-cloud-arrow-up"></i> 覆蓋儲存
                    </button>

                    <button id="notificationBtn" data-tip="rem-bell" data-action="open-sheet" data-sheet="notification" class="relative w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 soft-shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center">
                        <i id="bellIcon" class="fa-regular fa-bell text-base theme-text-primary"></i>
                        <span id="unreadBadge" class="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500"></span>
                    </button>

                    <!-- 家庭公告頁專用：管理（固定橘色；登入後才顯示） -->
                    <button id="headerManageBtn" data-action="notes-manage" data-tip="notes-manage" class="hidden h-10 px-4 rounded-full items-center gap-1.5 font-black text-sm text-white shadow-md hover:scale-105 active:scale-95 transition-all" style="background:#d97706"><i class="fa-solid fa-gear"></i> 管理</button>

                    <!-- 應用程式頁專用：︙ 所有應用設定（顏色跟著主色調；其他頁隱藏） -->
                    <button id="headerMoreBtn" data-action="open-apps-options" class="hidden w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 soft-shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center" title="所有應用設定" aria-label="所有應用設定">
                        <i class="fa-solid fa-ellipsis-vertical text-lg theme-text-primary"></i>
                    </button>

                    <!-- 家庭日曆頁專用：︙ 日曆設定（顏色跟著主色調；其他頁隱藏） -->
                    <button id="headerIdBtn" data-action="open-calendar-id" class="hidden w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 soft-shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center" title="日曆設定">
                        <i class="fa-solid fa-ellipsis-vertical text-lg theme-text-primary"></i>
                    </button>

                    <!-- 生活圖卡頁專用：︙ 生活圖卡設定（格式大小、排序方式；顏色跟著主色調；其他頁隱藏） -->
                    <button id="headerCardsBtn" data-action="open-cards-options" data-tip="cards-menu" class="hidden w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 soft-shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center" title="生活圖卡設定" aria-label="生活圖卡設定">
                        <i class="fa-solid fa-ellipsis-vertical text-lg theme-text-primary"></i>
                    </button>

                    <!-- 換誰洗碗頁專用：︙ 換誰洗碗設定（顏色跟著主色調；其他頁隱藏） -->
                    <button id="headerBowlBtn" data-action="open-bowl-options" class="hidden w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 soft-shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center" title="換誰洗碗設定" aria-label="換誰洗碗設定">
                        <i class="fa-solid fa-ellipsis-vertical text-lg theme-text-primary"></i>
                    </button>

                    <!-- 個人化按鈕 -->
                    <button id="headerPaletteBtn" data-action="open-settings" data-mode="personal" class="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 soft-shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center" title="大廳設定" aria-label="大廳設定">
                        <i class="fa-solid fa-palette text-base theme-text-primary"></i>
                    </button>
                </div>
            </div>
`;
