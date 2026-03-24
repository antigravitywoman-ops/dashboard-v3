#!/usr/bin/env node

/**
 * BACKUP SWEEPER SKILL
 * Archives and sweeps old memory snapshots to keep repo size down.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getOldFiles(dirPath, thresholdDays) {
    if (!fs.existsSync(dirPath)) return [];
    
    let oldFiles = [];
    const now = Date.now();
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile() && (now - stat.mtimeMs) > thresholdMs) {
            oldFiles.push(fullPath);
        }
    }
    
    return oldFiles;
}

function runSweep(companySlug, retentionDays = 90) {
    const baseDir = path.join(process.cwd(), 'companies', companySlug);
    
    const targetDirs = [
        path.join(baseDir, 'memory', 'snapshots'),
        path.join(baseDir, 'memory', 'competitors'),
        path.join(baseDir, 'technical', 'snapshots')
    ];
    
    let swept = 0;
    const archiveRoot = path.join(baseDir, 'memory', 'archives');
    
    if (!fs.existsSync(archiveRoot)) {
        fs.mkdirSync(archiveRoot, { recursive: true });
    }
    
    for (const dir of targetDirs) {
        const oldFiles = getOldFiles(dir, retentionDays);
        if (oldFiles.length > 0) {
            const archivePath = path.join(archiveRoot, path.basename(dir));
            if (!fs.existsSync(archivePath)) {
                fs.mkdirSync(archivePath, { recursive: true });
            }
            
            for (const file of oldFiles) {
                const dest = path.join(archivePath, path.basename(file));
                fs.renameSync(file, dest);
                swept++;
            }
        }
    }
    
    return {
        company: companySlug,
        status: "success",
        days_threshold: retentionDays,
        files_archived: swept
    };
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log(JSON.stringify({ error: "Usage: node backup-sweeper.js <company-slug> [--older-than=<days>d]" }));
    process.exit(1);
}

const companySlug = args[0];
let retention = 30; // 30 is default per SKILL.md
const olderThanArg = args.find(a => a.startsWith('--older-than='));
if (olderThanArg) {
    const val = olderThanArg.split('=')[1].replace('d', '');
    retention = parseInt(val, 10) || 30;
}

const result = runSweep(companySlug, retention);
console.log(JSON.stringify(result, null, 2));
