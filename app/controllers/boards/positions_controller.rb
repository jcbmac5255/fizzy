class Boards::PositionsController < ApplicationController
  include BoardScoped

  def update
    @board.access_for(Current.user).reposition(params[:position])

    respond_to do |format|
      format.turbo_stream { head :no_content }
      format.json { head :no_content }
    end
  end
end
