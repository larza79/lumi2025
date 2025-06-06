package settings

import (
	"github.com/larza79/lumi2025/pkg/consts"
	"github.com/spf13/viper"
)

var (
	Version = "0.0.0"
	Commit  = "localdev"
)

func Init() {
	viper.SetDefault(consts.DEVELOPMENT, false)

	viper.AutomaticEnv()
}
