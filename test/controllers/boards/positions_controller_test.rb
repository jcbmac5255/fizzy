require "test_helper"

class Boards::PositionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as :kevin
  end

  test "update moves board to the requested position" do
    board = boards(:private)

    patch board_position_path(board), params: { position: 1 }, as: :json
    assert_response :no_content

    first_board = users(:kevin).boards.ordered_by_recently_accessed.first
    assert_equal board.id, first_board.id
  end

  test "update with turbo_stream returns no content" do
    patch board_position_path(boards(:private)), params: { position: 1 }, as: :turbo_stream
    assert_response :no_content
  end

  test "users cannot reposition boards they do not have access to" do
    patch board_position_path(boards(:miltons_wish_list)), params: { position: 1 }, as: :json
    assert_response :not_found
  end
end
