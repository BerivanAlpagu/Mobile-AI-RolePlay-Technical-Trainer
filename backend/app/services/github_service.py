import tempfile
import os
from git import Repo, GitCommandError # GitCommandError'ı ekledim
import shutil
from typing import Optional


def clone_repo(repo_url: str) -> str:
    """
    Clone the given repository URL into a temporary directory and return the path.
    The caller is responsible for deleting the returned directory when finished.
    """
    print("DEBUG: 1.0 - GitHub Klonlama Başlatılıyor...") # DEBUG Noktası 1.0

    tmpdir = tempfile.mkdtemp(prefix="repo_clone_")
    
    try:
        # Use depth=1 to minimize clone size when possible
        Repo.clone_from(repo_url, tmpdir, depth=1)
        print("DEBUG: 1.1 - GitHub Klonlama BAŞARILI.") # DEBUG Noktası 1.1
        return tmpdir
    except GitCommandError as e:
        # Klonlama başarısız olursa geçici dizini temizle
        shutil.rmtree(tmpdir, ignore_errors=True)
        print(f"ERROR: Git Klonlama Hatası: {e}") # Hata loglama
        # Yeniden hata fırlatma (traceback'i yakalamak için)
        raise RuntimeError(f"GitHub repoyu klonlarken hata oluştu: {e}")
    except Exception as e:
        shutil.rmtree(tmpdir, ignore_errors=True)
        print(f"ERROR: Beklenmedik Klonlama Hatası: {e}")
        raise RuntimeError(f"Klonlama sırasında beklenmedik hata: {e}")


def read_code_files(repo_path: str) -> str:
    """
    Walk the repository path and read files with extensions .py, .js, .java, .ts
    Concatenate their contents into a single string and return it.
    """
    print("DEBUG: 1.2 - Kod Dosyaları Okunuyor.") # DEBUG Noktası 1.2
    
    exts = {".py", ".js", ".java", ".ts"}
    parts = []

    for root, _, files in os.walk(repo_path):
        for f in files:
            _, ext = os.path.splitext(f)
            if ext.lower() in exts:
                path = os.path.join(root, f)
                try:
                    with open(path, "r", encoding="utf-8") as fh:
                        content = fh.read()
                    header = f"\n\n--- FILE: {os.path.relpath(path, repo_path)} ---\n\n"
                    parts.append(header + content)
                except Exception:
                    # ignore files that can't be decoded or read
                    continue

    print("DEBUG: 1.3 - Tüm Kodlar Tek String Olarak Okundu.") # DEBUG Noktası 1.3
    return "\n".join(parts)