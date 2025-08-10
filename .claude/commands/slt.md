Use Bash tool to call: scripts/set_slt.sh "$ARGUMENT"

If ARGUMENT is provided:
- Execute: Bash(command="scripts/set_slt.sh \"$ARGUMENT\"")

If no ARGUMENT:
- Generate a 5-10 word summary of current work
- Execute: Bash(command="scripts/set_slt.sh \"summary\"")

This uses the allowed permission: Bash(scripts/set_slt.sh:*)
Model: haiku