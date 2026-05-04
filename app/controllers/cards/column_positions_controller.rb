class Cards::ColumnPositionsController < ApplicationController
  include CardScoped

  def update
    @card.reposition_in_column(params[:position])

    respond_to do |format|
      format.turbo_stream { head :no_content }
      format.json { head :no_content }
    end
  end
end
