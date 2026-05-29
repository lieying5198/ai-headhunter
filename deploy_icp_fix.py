#!/usr/bin/env python3
"""
Upload and apply ICP footer fix to the server
"""
import os
import subprocess
import sys

# Server details
SERVER = "1.14.202.115"
USERNAME = "root"
PASSWORD = "Lx@20180101"
REMOTE_PATH = "/www/wwwroot/ai-headhunter/src/components/job/JobListPage.tsx"
LOCAL_PATH = r"C:\Users\lieying\WorkBuddy\automation-20260425154155\ai-headhunter\src\components\job\JobListPage.tsx"

# The content to remove (footer section to delete)
FOOTER_TO_REMOVE = '''      {/* ICP备案信息 */}
      <footer className="bg-gray-800 py-4 text-center text-xs mt-8">
        <p className="text-gray-400 mb-1">猎英联盟 · 专业猎头服务</p>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-300 hover:text-white font-medium transition-colors"
        >
          粤ICP备2022099477号-1
        </a>
      </footer>
'''

def main():
    # Read local file
    with open(LOCAL_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if the footer is still present in local file
    if FOOTER_TO_REMOVE in content:
        print("Local file still has the footer to remove. It may have been reverted.")
    else:
        print("Local file already has the footer removed. Good!")

    # Check if the global footer is present in layout.tsx
    layout_path = LOCAL_PATH.replace('JobListPage.tsx', '../../app/layout.tsx')
    if os.path.exists(layout_path):
        with open(layout_path, 'r', encoding='utf-8') as f:
            layout_content = f.read()
        if '粤ICP备2022099477号-1' in layout_content:
            print("Global footer in layout.tsx is present. Good!")
        else:
            print("WARNING: Global footer not found in layout.tsx")

    # Commands to run on server
    commands = [
        # Download the file
        f'scp -o StrictHostKeyChecking=no {USERNAME}@{SERVER}:{REMOTE_PATH} /tmp/JobListPage.tsx.bak',
        # Read the file and remove the footer using sed
        f'ssh -o StrictHostKeyChecking=no {USERNAME}@{SERVER} "sed -i \'/<footer className=\"bg-gray-800 py-4 text-center text-xs mt-8\">/,/<\\/footer>/{{/<footer className=\"bg-gray-800 py-4 text-center text-xs mt-8\">/{{r /dev/stdin}};d}}}}\' {REMOTE_PATH}"',
    ]

    print("\nPlease run these commands manually on your server:")
    print("=" * 60)
    print(f"1. SSH to server: ssh {USERNAME}@{SERVER}")
    print(f"2. Edit the file: nano {REMOTE_PATH}")
    print("3. Delete lines 288-299 (the footer section)")
    print("4. Save and exit (Ctrl+X, then Y)")
    print("5. Rebuild: cd /www/wwwroot/ai-headhunter && npm run build")
    print("6. Restart: pm2 restart ai-headhunter && nginx -s reload")
    print("=" * 60)

    return 0

if __name__ == "__main__":
    sys.exit(main())
