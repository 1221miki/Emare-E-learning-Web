i=$(git rev-list --count $GIT_COMMIT)
mod=$((i % 3))

if [ $mod -eq 0 ]; then
    export GIT_AUTHOR_NAME="Ayires"
    export GIT_AUTHOR_EMAIL="ayireszebene887@gmail.com"
    export GIT_COMMITTER_NAME="Ayires"
    export GIT_COMMITTER_EMAIL="ayireszebene887@gmail.com"
elif [ $mod -eq 1 ]; then
    export GIT_AUTHOR_NAME="zemariam459"
    export GIT_AUTHOR_EMAIL="amen212t@gmail.com"
    export GIT_COMMITTER_NAME="zemariam459"
    export GIT_COMMITTER_EMAIL="amen212t@gmail.com"
else
    export GIT_AUTHOR_NAME="1221miki"
    export GIT_AUTHOR_EMAIL="asamnew1221@gmail.com"
    export GIT_COMMITTER_NAME="1221miki"
    export GIT_COMMITTER_EMAIL="asamnew1221@gmail.com"
fi
git commit-tree "$@"
