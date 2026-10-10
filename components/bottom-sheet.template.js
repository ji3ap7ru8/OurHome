// 共用 Bottom Sheet（最新提醒 / 帳號登入）模板
export const bottomSheetTemplate = `
        <div id="bottomSheet" class="bottom-sheet closed absolute bottom-0 left-0 right-0 bg-[#fcfbf9] dark:bg-slate-900 rounded-t-[36px] z-50 flex flex-col justify-between soft-shadow-lg border-t border-slate-200/60 dark:border-slate-800">
            <!-- 共用 Header -->
            <div class="sheet-header pt-3 pb-2 px-5 flex flex-col shrink-0 select-none cursor-ns-resize touch-none border-b border-slate-200/60 dark:border-slate-800">
                <div class="w-full flex justify-center py-1">
                    <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full hover:bg-slate-400 transition-colors"></div>
                </div>
                <div class="w-full flex items-center justify-between mt-1">
                    <div class="w-10 h-10 relative shrink-0">
                        <select data-tip="rem-filter" id="reminderFilter" aria-label="篩選提醒" class="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[3.75rem] pl-2 pr-0 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 theme-text-primary cursor-pointer">
                            <option value="unread">未讀</option>
                            <option value="read">已讀</option>
                        </select>
                    </div>
                    <!-- 動態渲染頁頭標題 -->
                    <div id="sheetHeaderTitle" class="flex items-center gap-2">
                        <i class="fa-solid fa-bell text-base theme-text-primary"></i>
                        <span class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-wider">最新提醒</span>
                        <span id="unreadHeaderBadge" data-tip="rem-badge" class="hidden px-2 py-0.5 rounded-full theme-bg-primary text-white text-[10px] font-bold">0 則未讀</span>
                    </div>
                    <button data-tip="rem-close" data-action="close-sheet" title="關閉視窗" class="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            <!-- 內容區塊 1: 最新提醒 -->
            <div id="sheetContentNotification" class="flex-1 flex flex-col overflow-hidden">
                <div id="notificationList" class="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
                </div>

            </div>

            <!-- 內容區塊 2: 帳號登入 (使用 Google 帳號登入) -->
            <div id="sheetContentLogin" class="flex-1 flex flex-col justify-center items-center px-6 py-8 space-y-6 hidden">
                <div class="text-center space-y-2">
                    <div class="w-14 h-14 rounded-3xl theme-bg-light theme-text-primary flex items-center justify-center text-2xl mx-auto mb-2 soft-shadow-sm">
                        <i class="fa-solid fa-user-lock"></i>
                    </div>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">會員帳號登入</h3>
                    <p class="text-xs text-slate-400 dark:text-slate-400">請登入帳號以同步雲端資料與使用完整功能</p>
                </div>

                <!-- 使用 Google 帳號登入按鈕 -->
                <button data-action="login-google" class="w-full max-w-xs py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 soft-shadow-sm transition-all active:scale-95 cursor-pointer">
                    <i class="fa-brands fa-google text-lg text-red-500"></i>
                    <span>使用 Google 帳號登入</span>
                </button>
            </div>

            <!-- 內容區塊 3: 管理員驗證（輸入密碼才能解鎖管理員功能） -->
            <div id="sheetContentAdmin" class="flex-1 flex flex-col justify-center items-center px-6 py-8 space-y-5 hidden">
                <div class="text-center space-y-2">
                    <div class="w-14 h-14 rounded-3xl theme-bg-light theme-text-primary flex items-center justify-center text-2xl mx-auto mb-2 soft-shadow-sm">
                        <i class="fa-solid fa-user-shield"></i>
                    </div>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">管理員驗證</h3>
                    <p class="text-xs text-slate-400 dark:text-slate-400">請輸入管理員密碼以解鎖管理員功能</p>
                </div>
                <div class="w-full max-w-xs space-y-2">
                    <input id="adminPasswordInput" type="text" data-mask="on" data-lpignore="true" data-1p-ignore data-form-type="other" name="x-admin-pass" autocomplete="off" placeholder="管理員密碼" class="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-800 dark:text-slate-100 text-center tracking-widest focus:outline-none focus:border-orange-500">
                    <p id="adminPasswordError" class="hidden text-[11px] font-bold text-rose-600 text-center"></p>
                </div>
                <button data-action="admin-verify" class="w-full max-w-xs py-3.5 px-4 theme-bg-primary text-white rounded-2xl font-bold text-xs soft-shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-unlock"></i>
                    <span>驗證</span>
                </button>
            </div>
        </div>
`;
